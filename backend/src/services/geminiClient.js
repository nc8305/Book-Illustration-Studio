const { GoogleGenAI } = require('@google/genai');
const fs = require('fs/promises');
const path = require('path');

if (!process.env.GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in the environment.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'MISSING_API_KEY' });
const TEXT_MODEL = "gemini-3.5-flash";

const stylePrompt = "There must be no text on the image, it should not look like a cover page. It should be an full illustration with no borders, titles, nor description. Unless asked otherwise, stay family-friendly with uplifting colors. Each produced should be a simple image, no panels.";

async function generateSvgImage(prompt) {
  const svgPrompt = `You are an expert SVG designer. Create a beautiful, detailed vector illustration using SVG code that visually represents the following description: "${prompt}".
Rules:
1. ONLY return valid SVG XML code. Do NOT wrap it in markdown block quotes (like \`\`\`xml). If you do, I will have to strip it.
2. The SVG should have a viewBox="0 0 800 600" and width="100%" height="100%" and include <svg xmlns="http://www.w3.org/2000/svg"> and </svg> tags.
3. Use gradients, shapes, and good colors to make it look like a book illustration.
4. Do NOT include any HTML or explanatory text. Just the SVG code.`;

  try {
    const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: svgPrompt
    });
    
    let svgCode = response.text || "";
    // Clean up markdown wrapping if present
    if (svgCode.includes("```")) {
      const match = svgCode.match(/```(?:xml|svg)?\n([\s\S]*?)```/);
      if (match && match[1]) {
        svgCode = match[1].trim();
      } else {
        svgCode = svgCode.replace(/```(xml|svg)?/g, "").trim();
      }
    }
    
    const buffer = Buffer.from(svgCode, "utf-8");
    return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error(`[SVG Generation Error detail]:`, err);
    throw new Error(`SVG generation failed: ${err.message}`);
  }
}

// Hàm tạo độ trễ để tránh lỗi 429 (Quota exceeded)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callStep(projectId, stepName, project, payload) {
  switch (stepName) {
    case 'style':
      return await generateStyle(project, payload);
    case 'characters':
      return await generateCharacters(project);
    case 'portraits':
      return await generatePortraits(project);
    case 'chapters':
      return await generateChapters(project);
    case 'illustrations':
      return await generateIllustrations(project);
    default:
      throw new Error(`Unknown step ${stepName}`);
  }
}

async function uploadBookIfNeeded(project) {
  if (project.geminiFileUri) {
    return project.geminiFileUri;
  }

  const tmpPath = path.join(process.cwd(), 'data', `${project.id}.txt`);
  await fs.writeFile(tmpPath, project.bookText);

  try {
    const fileResponse = await ai.files.upload({ file: tmpPath });
    return fileResponse.uri;
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

async function startInteraction(project, input) {
  const fileUri = await uploadBookIfNeeded(project);
  const interactionPayload = {
    model: TEXT_MODEL,
    input: [
      { type: "text", text: input },
      { type: "document", uri: fileUri }
    ]
  };

  if (project.lastInteractionId) {
    interactionPayload.previous_interaction_id = project.lastInteractionId;
  }

  const interaction = await ai.interactions.create(interactionPayload);
  return { interaction, fileUri };
}

async function generateStyle(project, payload) {
  let styleStr = payload?.style || "";
  let interactionRes;

  if (!styleStr) {
    interactionRes = await startInteraction(project, "Can you define an art style that would fit the story but with a twist? Just give us the prompt for the art style that will be added to future prompts.");
    styleStr = interactionRes.interaction.output_text.trim();
  } else {
    interactionRes = await startInteraction(project, `The art style will be: "${styleStr}". Keep that in mind when generating future prompts. Keep quiet for now, instructions will follow.`);
  }

  return {
    style: styleStr,
    lastInteractionId: interactionRes.interaction.id,
    geminiFileUri: interactionRes.fileUri
  };
}

async function generateCharacters(project) {
  const schema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        prompt: { type: "string" }
      },
      required: ["name", "prompt"]
    }
  };

  const interactionPayload = {
    model: TEXT_MODEL,
    input: "Can you describe the main characters (only the adults) and prepare a prompt describing them with as much details as possible (use the descriptions from the book) so an image model can generate images of them? Limit to exactly 2 characters. Each prompt should be at least 50 words.",
    previous_interaction_id: project.lastInteractionId,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: schema
    }
  };

  const interaction = await ai.interactions.create(interactionPayload);
  let characters = JSON.parse(interaction.output_text);

  if (characters.length > 2) {
    characters = characters.slice(0, 2);
  }

  return {
    characters,
    lastInteractionId: interaction.id
  };
}

async function generatePortraits(project) {
  // Access characters from previous step's result
  const updatedCharacters = [...project.steps.characters.result.characters];

  for (let i = 0; i < updatedCharacters.length; i++) {
    const char = updatedCharacters[i];
    if (char.portraitBase64) continue;

    const input = `Create an illustration for ${char.name} following this description: ${char.prompt}. The style we want you to follow is: Follow this style: "${project.steps.style.result.style}". Also follow those rules: ${stylePrompt}`;

    let b64 = "";
    try {
      b64 = await generateSvgImage(input);
    } catch (err) {
      console.error(`[SVG detail] portrait ${char.name}:`, err);
      throw new Error(`SVG generation failed while generating portrait for ${char.name}. Wait a moment and retry this step. Original error: ${err.message}`);
    }

    char.portraitBase64 = b64;

    // Tạm dừng 3 giây (Text model chạy nhanh hơn image model)
    if (i < updatedCharacters.length - 1) {
      console.log(`Đã tạo xong ảnh cho ${char.name}. Chờ 3 giây trước khi tiếp tục...`);
      await sleep(3000);
    }
  }

  return {
    characters: updatedCharacters
  };
}

async function generateChapters(project) {
  const schema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        prompt: { type: "string" },
        characters: { type: "array", items: { type: "string" } }
      },
      required: ["name", "prompt", "characters"]
    }
  };

  const interactionPayload = {
    model: TEXT_MODEL,
    input: "Now, for the chapters of the book, give me a prompt to illustrate what happens in it. Limit to exactly 1 chapter. It should be a single image. Be very descriptive and remember to tell their name and reuse the character prompts. Also list all characters who appear in it.",
    previous_interaction_id: project.steps.characters.result.lastInteractionId,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: schema
    }
  };

  const interaction = await ai.interactions.create(interactionPayload);
  let chapters = JSON.parse(interaction.output_text);

  if (chapters.length > 1) {
    chapters = chapters.slice(0, 1);
  }

  return {
    chapters,
    lastInteractionId: interaction.id
  };
}

async function generateIllustrations(project) {
  const updatedChapters = [...project.steps.chapters.result.chapters];

  for (let i = 0; i < updatedChapters.length; i++) {
    const chapter = updatedChapters[i];
    if (chapter.illustrationBase64) continue;

    let prompt = `Create this illustration for ${chapter.name}: ${chapter.prompt}\nThe style we want you to follow is: "${project.steps.style.result.style}". Also follow those rules: ${stylePrompt}\n`;

    if (chapter.characters && chapter.characters.length > 0) {
      prompt += `\nCharacters appearing in this scene:\n`;
      for (const charName of chapter.characters) {
        const charData = project.steps.portraits.result.characters.find(c => c.name === charName);
        if (charData) {
          prompt += `- ${charName}: ${charData.prompt}\n`;
        }
      }
    }

    let b64 = "";
    try {
      b64 = await generateSvgImage(prompt);
    } catch (err) {
      console.error(`[SVG detail] illustration ${chapter.name}:`, err);
      throw new Error(`SVG generation failed while generating illustration for ${chapter.name}. Wait a moment and retry this step. Original error: ${err.message}`);
    }

    chapter.illustrationBase64 = b64;

    // Tạm dừng 3 giây 
    if (i < updatedChapters.length - 1) {
      console.log(`Đã tạo xong minh họa cho ${chapter.name}. Chờ 3 giây trước khi tiếp tục...`);
      await sleep(3000);
    }
  }

  return {
    chapters: updatedChapters
  };
}

module.exports = {
  callStep,
  generateSvgImage
};
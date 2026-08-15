const { GoogleGenAI } = require('@google/genai');
const { InferenceClient } = require('@huggingface/inference');
const fs = require('fs/promises');
const path = require('path');

if (!process.env.GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in the environment.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'MISSING_API_KEY' });
const TEXT_MODEL = "gemini-3.5-flash";
// IMAGE_MODEL is now replaced by Hugging Face FLUX.1-dev via Inference Providers

const stylePrompt = "There must be no text on the image, it should not look like a cover page. It should be an full illustration with no borders, titles, nor description. Unless asked otherwise, stay family-friendly with uplifting colors. Each produced should be a simple image, no panels.";

// The model itself, not a fixed provider URL. Hugging Face's Inference Providers
// router picks a provider that currently serves this model — providers offering
// a given model change over time (e.g. FLUX.1-dev was dropped from "hf-inference"
// but is still served by "fal-ai", "replicate", etc.), so we let the SDK route it
// instead of hardcoding a provider-specific endpoint.
const HF_IMAGE_MODEL = "black-forest-labs/FLUX.1-dev";
// Set HF_PROVIDER in .env to pin a specific provider (e.g. "fal-ai", "replicate").
// Defaults to "auto", which picks the fastest available provider for the model.
const HF_PROVIDER = process.env.HF_PROVIDER || "auto";

async function generateFluxImage(prompt) {
  if (!process.env.HF_TOKEN) {
    throw new Error("CRITICAL ERROR: HF_TOKEN is not set. Cannot generate images via Hugging Face.");
  }

  const client = new InferenceClient(process.env.HF_TOKEN);

  let imageBlob;
  try {
    imageBlob = await client.textToImage({
      model: HF_IMAGE_MODEL,
      inputs: prompt,
      provider: HF_PROVIDER,
    });
  } catch (err) {
    console.error(`[HF Error detail]:`, err);
    throw new Error(`Hugging Face image generation failed: ${err.message}`);
  }

  const buffer = Buffer.from(await imageBlob.arrayBuffer());
  // The SDK returns a Blob; its `type` reflects the provider's content-type.
  const contentType = imageBlob.type || "image/jpeg";
  return `data:${contentType};base64,${buffer.toString('base64')}`;
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
      b64 = await generateFluxImage(input);
    } catch (err) {
      console.error(`[HF detail] portrait ${char.name}:`, err);
      throw new Error(`HF image generation failed while generating portrait for ${char.name}. Wait a moment and retry this step. Original error: ${err.message}`);
    }

    char.portraitBase64 = b64;

    // Tạm dừng 10 giây trước khi xử lý nhân vật tiếp theo (trừ nhân vật cuối cùng)
    if (i < updatedCharacters.length - 1) {
      console.log(`Đã tạo xong ảnh cho ${char.name}. Chờ 10 giây trước khi tiếp tục...`);
      await sleep(10000);
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
      b64 = await generateFluxImage(prompt);
    } catch (err) {
      console.error(`[HF detail] illustration ${chapter.name}:`, err);
      throw new Error(`HF image generation failed while generating illustration for ${chapter.name}. Wait a moment and retry this step. Original error: ${err.message}`);
    }

    chapter.illustrationBase64 = b64;

    // Tạm dừng 10 giây trước khi xử lý chương tiếp theo (trừ chương cuối cùng)
    if (i < updatedChapters.length - 1) {
      console.log(`Đã tạo xong minh họa cho ${chapter.name}. Chờ 10 giây trước khi tiếp tục...`);
      await sleep(10000);
    }
  }

  return {
    chapters: updatedChapters
  };
}

module.exports = {
  callStep,
  // exported for unit testing
  generateFluxImage,
  HF_IMAGE_MODEL,
  HF_PROVIDER
};
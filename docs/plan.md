# Book Illustration Studio - Implementation Plan

Dựa trên thiết kế kiến trúc và state machine, dưới đây là kế hoạch triển khai chi tiết cho hệ thống Book Illustration Studio.

## Kiến trúc hệ thống
- **Backend**: Node.js + Express. Xử lý logic state machine, quản lý file storage, và là wrapper duy nhất gọi Gemini API.
- **Frontend**: React (Vite). Đơn giản, polling trạng thái từ backend, vẽ UI theo state trả về.
- **Storage**: JSON files (local file system) với cơ chế in-memory mutex để tránh race condition khi read/write đồng thời.
- **AI Tooling**: Lưu lại toàn bộ quá trình ra quyết định vào `DECISIONS.md`, các context vào `CLAUDE.md`, `.cursor/rules`...

## Proposed Changes

### 1. Khởi tạo Project & Cấu trúc thư mục
- Tạo thư mục `backend` và `frontend` như đề xuất.
- Setup các file config cơ bản: `package.json`, `vite.config.js`, `.env.example`, `start.sh`, `test.sh`.

### 2. Backend - Core State Machine & Storage
- Xây dựng module storage đọc/ghi JSON với thư viện `async-mutex`.
- Xây dựng Pipeline Controller quản lý vòng đời của 1 project:
  - Tách biệt trạng thái tổng (`status`) và trạng thái từng bước (`step_state`: `pending`, `in_progress`, `done`, `failed`).
  - Implement idempotency: Chặn gọi API nếu step đang ở trạng thái `in_progress`.
  - Stuck state recovery: Timeout logic dựa trên `startedAt` timestamp (ví dụ 5 phút) để cho phép user retry.

### 3. Backend - Gemini Service Integration
- Xây dựng wrapper `geminiClient.js`.
- Mapping 5 bước của notebook sang REST API calls:
  1. Style (text)
  2. Characters (structured JSON, max 2)
  3. Portraits (image gen)
  4. Chapters (structured JSON, max 1)
  5. Illustrations (image gen)

### 4. Frontend - UI/UX
- Khởi tạo UI với Vite, tích hợp Vanilla CSS theo yêu cầu thay vì Tailwind.
- Các màn hình chính:
  - Identity (nhập email/tên).
  - Project List.
  - Project Detail (Pipeline view với Stepper).
- Xử lý UI logic: Polling pipeline state, render progress/errors/retry states.

### 5. Documentation & Testing
- Viết `DECISIONS.md` ngay trong quá trình làm (ghi nhận các trade-offs, AI overrides).
- Viết `TESTING.md` và implement Unit/Integration tests cho backend logic bằng `node:test` và frontend bằng `vitest`.

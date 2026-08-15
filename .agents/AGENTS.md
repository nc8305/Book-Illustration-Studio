## Enterprise Git Workflow Rules (DLVN Standard)
Khi thực hiện các thao tác với Git (như tạo branch hoặc commit code), bạn bắt buộc phải tuân thủ nghiêm ngặt các quy tắc sau trừ khi người dùng có yêu cầu khác:

1. **Branch Naming Convention:**
   - Format bắt buộc: `<type>/<TICKET_ID>-<kebab-case-description>`
   - Các type hợp lệ: `feature` (tính năng mới/STORY/ENH), `fix` (sửa lỗi thông thường/SR), `hotfix` (sửa lỗi gấp/INC), `chore` (cấu hình/CR).
   - Ví dụ: `fix/SR000004-update-api-response`

2. **Commit Message Convention:**
   - Format bắt buộc: `[<TICKET_ID>] <type>(<scope>): <Mô tả ngắn gọn>`
   - Ví dụ: `[SR000004] fix(auth): update token expiration logic`
   - Bắt buộc phải có mã Ticket_ID ở đầu dòng. Nếu người dùng không cung cấp mã Ticket, hãy hỏi người dùng mã Ticket là gì hoặc tự động dùng một mã mặc định (như `[SR000000]`) và nhắc nhở người dùng.

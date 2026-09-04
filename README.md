# Hệ thống theo dõi & báo cáo KPIs Chiến lược phát triển ĐHQG-HCM

Website báo cáo kết quả thực hiện **KPIs Chiến lược phát triển ĐHQG-HCM giai đoạn 2021–2030, tầm nhìn 2045** cho **Trường ĐH Khoa học Tự nhiên** — xây dựng theo Công văn số 1312/ĐHQG-CLĐT và Biểu mẫu số 02 (Báo cáo kết quả thực hiện kế hoạch CTHĐ năm 2026).

Dữ liệu KPI, danh mục đơn vị và số liệu tháng 6–7/2026 được **nạp sẵn từ chính file Excel của Trường**.

## Kiến trúc

| Thành phần | Công nghệ |
|-----------|-----------|
| Backend   | Node.js + Express + SQLite (better-sqlite3) + JWT |
| Frontend  | React + Vite + TailwindCSS + Recharts |
| Xác thực  | JWT, mật khẩu băm bcrypt |

## Hai phân hệ & phân quyền

- **Super Admin** — toàn quyền: quản lý người dùng, **gán ai được chỉnh sửa và thuộc đơn vị nào**, và nhập số liệu cho bất kỳ đơn vị.
- **Editor** — chỉ nhập/chỉnh sửa số liệu **đúng đơn vị được gán** (ví dụ Editor thuộc đơn vị A chỉ thấy và nhập KPI của đơn vị A). Ràng buộc được thực thi ở **cả backend** (bỏ qua `unit_id` gửi lên, luôn dùng đơn vị của tài khoản) lẫn giao diện.
- **Người xem (công khai)** — không cần đăng nhập, xem dashboard trực quan.

## Đặc điểm dữ liệu (ghi thêm theo tháng — không ghi đè)

Mỗi ô số liệu `(KPI × đơn vị × tháng)` được lưu **append-only**: khi chỉnh sửa, bản ghi cũ được đánh dấu `is_current = 0` và tạo bản ghi mới — **lịch sử được giữ nguyên**, không mất dữ liệu. Càng nhiều tháng trôi qua, biểu đồ càng dày và rõ nét. Dashboard có **thanh trượt thời gian** để xem số liệu lũy kế đến từng tháng, và **7 dạng layout/biểu đồ** có thể chuyển đổi.

## Chạy dự án

### 1) Backend
```bash
cd server
npm install
npm start          # http://localhost:4600  (tự tạo & seed data.sqlite lần đầu)
```

### 2) Frontend
Chế độ phát triển (hot reload, proxy API sang :4600):
```bash
cd client
npm install
npm run dev        # http://localhost:5600
```

Chế độ production (backend phục vụ luôn frontend đã build):
```bash
cd client && npm install && npm run build
cd ../server && npm start
# Mở http://localhost:4600  (cả FE lẫn API cùng một cổng)
```

## Tài khoản demo

| Vai trò | Tài khoản | Mật khẩu |
|---------|-----------|----------|
| Super Admin | `admin` | `admin123` |
| Editor · Khoa CNTT | `cntt` | `cntt123` |
| Editor · Phòng KHCN | `khcn` | `khcn123` |

> Đổi mật khẩu và `JWT_SECRET` (biến môi trường) trước khi triển khai thật.

## Cấu trúc thư mục

```
server/
  src/
    index.js            # Express app, phục vụ API + frontend build
    db.js               # Khởi tạo SQLite, migrate & seed từ seed.json
    auth.js             # JWT, middleware phân quyền, ràng buộc đơn vị
    seed.json           # Dữ liệu trích từ file Excel của Trường
    routes/
      auth.js           # đăng nhập, đổi mật khẩu
      meta.js           # nhóm, đơn vị, KPI (công khai)
      dashboard.js      # dữ liệu tổng hợp cho dashboard (công khai)
      entries.js        # nhập số liệu tháng (append-only), lịch sử
      users.js          # quản lý người dùng (chỉ Super Admin)
client/
  src/
    pages/              # Dashboard, Login, Editor, AdminUsers
    components/Charts.jsx
    lib/compute.js      # tổng hợp số liệu -> nhiều dạng biểu đồ
```

## API chính

| Method | Endpoint | Quyền |
|--------|----------|-------|
| POST | `/api/auth/login` | công khai |
| GET  | `/api/dashboard/data?year=` | công khai |
| GET  | `/api/dashboard/summary?year=` | công khai |
| GET  | `/api/entries/my-kpis?year=` | đã đăng nhập (theo đơn vị) |
| POST | `/api/entries/submit` | editor/admin (ràng buộc đơn vị) |
| GET  | `/api/entries/history` | đã đăng nhập |
| GET/POST/PUT/DELETE | `/api/users` | Super Admin |

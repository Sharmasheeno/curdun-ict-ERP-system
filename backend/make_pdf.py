import os
from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 9)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, "CURDUN ERP - Backend Technical Documentation", border=0, new_x="RIGHT", new_y="TOP", align="L")
            self.cell(0, 8, f"Page {self.page_no()}", border=0, new_x="LMARGIN", new_y="NEXT", align="R")
            self.set_draw_color(200, 200, 200)
            self.line(10, 16, 200, 16)
            self.ln(3)

    def footer(self):
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(128, 128, 128)
            self.cell(0, 10, "Confidential - CURDUN ICT Solutions / COR Platform", align="C")

def generate_pdf():
    pdf = PDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # --- COVER PAGE ---
    pdf.add_page()
    pdf.set_fill_color(45, 24, 89) # #2D1859 Brand Dark Purple
    pdf.rect(0, 0, 210, 297, "F")
    
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 32)
    pdf.set_y(80)
    pdf.cell(0, 15, "CURDUN ERP", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(245, 196, 17) # Gold
    pdf.cell(0, 12, "Backend Architecture & REST API Documentation", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(217, 210, 238)
    pdf.cell(0, 10, "COR Platform - CURDUN ICT Solutions", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_y(220)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(200, 200, 200)
    pdf.cell(0, 6, "Version: 1.0.0 (Pure Custom PHP 8 MVC)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Database: curdun_erp (MySQL 8 - 34 Tables)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Date: August 2026", align="C", new_x="LMARGIN", new_y="NEXT")
    
    # --- PAGE 2: EXECUTIVE SUMMARY & ARCHITECTURE ---
    pdf.add_page()
    pdf.set_text_color(45, 24, 89)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "1. Executive Summary & Architecture", new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(45, 24, 89)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    
    pdf.set_text_color(40, 40, 40)
    pdf.set_font("Helvetica", "", 9.5)
    text = (
        "The Curdun ERP backend is a 100% backend-only REST API system built for CURDUN ICT Solutions. "
        "It employs a custom pure PHP 8+ MVC architecture without external frameworks (such as Laravel or Symfony). "
        "The architecture strictly adheres to modern OOP principles, PSR-4 autoloading, PDO prepared statements, "
        "and clean separation of concerns across Controllers, Services, Repositories, and Models."
    )
    pdf.multi_cell(0, 5.5, text)
    pdf.ln(3)
    
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(45, 24, 89)
    pdf.cell(0, 7, "Key Architectural Constraints:", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(40, 40, 40)
    bullets = [
        "- 100% BACKEND ONLY: Zero HTML/CSS/JS frontend dependencies.",
        "- Pure PHP 8+ & MySQL 8+: Utilizes native PDO with prepared statements for all database access.",
        "- Thin Controllers & Layered Design: Request -> Controller -> Service -> Repository -> Model -> Database.",
        "- RBAC Security: Strict Role-Based Access Control enforcing fine-grained module permissions.",
        "- Database Concurrency Safety: Uses SELECT ... FOR UPDATE row-locking during inventory transactions.",
        "- Standardized JSON Responses: Every endpoint outputs uniform JSON structure across success and error paths."
    ]
    for b in bullets:
        pdf.set_x(15)
        pdf.multi_cell(180, 5, b)
    pdf.ln(4)
    
    # Directory Structure
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(45, 24, 89)
    pdf.cell(0, 7, "Directory Structure:", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Courier", "", 8)
    pdf.set_fill_color(245, 245, 248)
    pdf.set_text_color(30, 30, 30)
    tree = (
        "backend/\n"
        "|-- app/\n"
        "|   |-- Controllers/     (25 Thin API Controllers)\n"
        "|   |-- Models/          (31 Entity Models extending BaseModel)\n"
        "|   |-- Services/        (25 Business Logic Services)\n"
        "|   |-- Repositories/    (23 Repositories for Database Abstraction)\n"
        "|   +-- Middleware/      (AuthMiddleware, RoleMiddleware, PermissionMiddleware)\n"
        "|-- config/              (app.php, database.php, security.php, cors.php, constants.php)\n"
        "|-- core/                (Database, Router, Request, Response, Auth, Session, Validator, Logger)\n"
        "|-- exceptions/          (Validation, Authentication, Authorization, NotFound, Conflict)\n"
        "|-- helpers/             (response.php, validation.php, security.php, formatting.php, permissions.php)\n"
        "|-- routes/              (api.php - REST API v1, web.php)\n"
        "|-- database/            (curdun_erp.sql - 34 Tables, seed.php importer)\n"
        "+-- public/              (index.php Single Entry Point, .htaccess)"
    )
    pdf.multi_cell(0, 4, tree, fill=True)

    # --- PAGE 3: DATABASE SCHEMA & SEED DATA ---
    pdf.add_page()
    pdf.set_text_color(45, 24, 89)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "2. Database Schema & Relational Structure", new_x="LMARGIN", new_y="NEXT")
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(0, 5.5, "The 'curdun_erp' MySQL database consists of 34 relational tables organized into 8 functional domain modules:")
    pdf.ln(3)
    
    # Table of Modules
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_fill_color(45, 24, 89)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(40, 6.5, " Module", border=1, fill=True)
    pdf.cell(150, 6.5, " Database Tables", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(40, 40, 40)
    modules = [
        ("Auth & ACL", "users, roles, permissions, user_roles, role_permissions, sessions, password_resets"),
        ("Organization", "companies, branches, departments"),
        ("CRM", "customers, suppliers"),
        ("Inventory", "categories, units, taxes, warehouses, products, stock_movements"),
        ("Purchases", "purchase_orders, purchase_order_items"),
        ("Sales", "orders, order_items, sales_returns, sales_return_items"),
        ("Finance", "invoices, invoice_items, payments, payment_methods, expenses, expense_categories, currencies"),
        ("System", "notifications, settings, audit_logs")
    ]
    
    fill = False
    for mod, tbls in modules:
        pdf.set_fill_color(245, 245, 250) if fill else pdf.set_fill_color(255, 255, 255)
        pdf.cell(40, 5.5, f" {mod}", border=1, fill=True)
        pdf.cell(150, 5.5, f" {tbls}", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
        fill = not fill
    pdf.ln(5)
    
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(45, 24, 89)
    pdf.cell(0, 7, "Default Admin Credentials:", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 5.5, "- Username/Email: admin@curdun.so", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5.5, "- Password: Admin@1234", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5.5, "- Default Role: superadmin", new_x="LMARGIN", new_y="NEXT")

    # --- PAGE 4: REST API ENDPOINTS REFERENCE ---
    pdf.add_page()
    pdf.set_text_color(45, 24, 89)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "3. Complete REST API Endpoints Reference", new_x="LMARGIN", new_y="NEXT")
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    
    # Table header
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(45, 24, 89)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(20, 6, " Method", border=1, fill=True)
    pdf.cell(65, 6, " Route Endpoint", border=1, fill=True)
    pdf.cell(65, 6, " Description", border=1, fill=True)
    pdf.cell(40, 6, " Permission", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(40, 40, 40)
    
    endpoints = [
        ("POST", "/api/v1/auth/login", "Authenticate user & start session", "Public"),
        ("POST", "/api/v1/auth/logout", "Terminate active user session", "Authenticated"),
        ("GET", "/api/v1/auth/me", "Get current user profile & roles", "Authenticated"),
        ("POST", "/api/v1/auth/forgot-password", "Generate password reset token", "Public"),
        ("POST", "/api/v1/auth/reset-password", "Execute password reset with token", "Public"),
        ("GET", "/api/v1/users", "Paginated list of users", "users.view"),
        ("POST", "/api/v1/users", "Create user account", "users.create"),
        ("GET", "/api/v1/users/{id}", "Get single user details", "users.view"),
        ("PUT", "/api/v1/users/{id}", "Update user account", "users.update"),
        ("DELETE", "/api/v1/users/{id}", "Soft-delete user account", "users.delete"),
        ("POST", "/api/v1/users/{id}/roles", "Assign user roles", "roles.update"),
        ("GET", "/api/v1/roles", "List all system roles", "roles.view"),
        ("POST", "/api/v1/roles", "Create new role with permissions", "roles.create"),
        ("GET", "/api/v1/permissions", "List permissions grouped by module", "roles.view"),
        ("GET/POST", "/api/v1/customers", "Customer management & search", "customers.*"),
        ("GET/POST", "/api/v1/suppliers", "Supplier management & search", "suppliers.*"),
        ("GET/POST", "/api/v1/products", "Product management & barcode lookup", "products.*"),
        ("GET", "/api/v1/products/low-stock", "List low stock alert items", "products.view"),
        ("GET/POST", "/api/v1/inventory", "Stock levels & movement history", "inventory.*"),
        ("POST", "/api/v1/inventory/adjust", "Manual stock quantity adjustment", "inventory.adjust"),
        ("POST", "/api/v1/inventory/transfer", "Inter-warehouse stock transfer", "inventory.adjust"),
        ("GET/POST", "/api/v1/orders", "Sales order processing", "orders.*"),
        ("POST", "/api/v1/orders/{id}/complete", "Execute order completion workflow", "orders.complete"),
        ("GET/POST", "/api/v1/invoices", "Invoice creation & management", "invoices.*"),
        ("POST", "/api/v1/payments", "Record customer payments", "payments.create"),
        ("GET/POST", "/api/v1/expenses", "Track company business expenses", "expenses.*"),
        ("GET", "/api/v1/reports/sales", "Generate detailed sales reports", "reports.view"),
        ("GET", "/api/v1/reports/revenue", "Generate revenue reports", "reports.view"),
        ("GET", "/api/v1/dashboard/summary", "Dashboard overall metrics summary", "Authenticated"),
        ("GET", "/api/v1/audit-logs", "System audit trails & operation logs", "audit_logs.view"),
    ]
    
    fill = False
    for method, route, desc, perm in endpoints:
        pdf.set_fill_color(245, 245, 250) if fill else pdf.set_fill_color(255, 255, 255)
        pdf.cell(20, 5, f" {method}", border=1, fill=True)
        pdf.cell(65, 5, f" {route}", border=1, fill=True)
        pdf.cell(65, 5, f" {desc}", border=1, fill=True)
        pdf.cell(40, 5, f" {perm}", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
        fill = not fill

    # --- PAGE 5: BUSINESS LOGIC WORKFLOWS & SECURITY ---
    pdf.add_page()
    pdf.set_text_color(45, 24, 89)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "4. Business Logic Workflows & Security", new_x="LMARGIN", new_y="NEXT")
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Order Completion Workflow (POST /api/v1/orders/{id}/complete)", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(40, 40, 40)
    steps = [
        "1. Validate Order: Verifies that the order exists and is in CONFIRMED state.",
        "2. Stock Verification & Row Locking: Issues 'SELECT ... FOR UPDATE' on product rows to lock stock during checkout.",
        "3. Inventory Reduction: Reduces product stock quantity safely.",
        "4. Stock Movement Creation: Automatically inserts a 'stock_movements' record of type 'SALE'.",
        "5. Invoice Generation: Creates a new Invoice with subtotal, tax, discount, total, and balance.",
        "6. Audit Logging: Logs the action, acting user ID, IP address, and timestamp.",
        "7. Atomic Commit: All steps complete inside a PDO Transaction block; failure triggers instant ROLLBACK."
    ]
    for s in steps:
        pdf.set_x(15)
        pdf.multi_cell(180, 5, s)
    pdf.ln(5)
    
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(45, 24, 89)
    pdf.cell(0, 7, "Security & Compliance Features:", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(40, 40, 40)
    sec_features = [
        "- SQL Injection Prevention: All DB access uses PDO prepared statements with bound parameters.",
        "- Secure Password Hashing: BCRYPT algorithm with cost factor 12 (password_hash).",
        "- Session Hardening: Configured with HttpOnly, SameSite=Strict, session regeneration, and lifetime expiration.",
        "- Rate Limiting: Built-in IP-based rate limiting on sensitive endpoints (e.g., 5 attempts in 5 mins for login).",
        "- HTTP Security Headers: Emits X-Frame-Options, X-Content-Type-Options, CSP, and CORS restrictions."
    ]
    for sf in sec_features:
        pdf.set_x(15)
        pdf.multi_cell(180, 5, sf)
    pdf.ln(8)
    
    pdf.set_font("Helvetica", "I", 9.5)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, "--- End of Technical Documentation ---", align="C", new_x="LMARGIN", new_y="NEXT")
    
    output_path = r"c:\Users\cabdi\Desktop\curdun-ict-ERP-system-main\backend\CURDUN_ERP_BACKEND_DOCUMENTATION.pdf"
    pdf.output(output_path)
    print(f"PDF Generated Successfully at: {output_path}")

if __name__ == "__main__":
    generate_pdf()

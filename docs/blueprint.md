# **App Name**: LabFlow

## Core Features:

- Lab Channel Navigation: Discord-inspired interface to browse specific laboratory channels (e.g., #laboratory-1 for Arduino kits, #laboratory-3 for chemistry equipment) and their available inventory.
- Dynamic Inventory Display: Real-time view of all items within a selected lab channel, including their availability, current status (available, locked, borrowed), and detailed information.
- Student Item Request & QR Generation: Students can select desired items, initiate a borrowing request, and generate a unique QR code for pickup confirmation.
- Teacher OTP Authorization: Teachers can generate and issue One-Time Passwords for students, granting them temporary access to borrow specific locked or high-value equipment.
- Staff Checkout & Inventory Update: Admin/Staff can scan a student's QR code using a hardware scanner to finalize the borrowing process, automatically updating item status and transaction logs in the database.
- AI Equipment Suggestion Tool: An AI-powered tool that provides intelligent recommendations for suitable equipment based on a student's project description or a teacher's learning objectives, helping users efficiently find the right resources.
- Admin/Staff Inventory & Borrowing Management: Comprehensive interface for Admin/Staff to manage inventory items (add, edit, delete, lock/unlock), track their location, and oversee all borrowing activities and history.

## Style Guidelines:

- Primary color: A sophisticated, clean blue (#3A8BAD) for a technical and trustworthy feel. Hue 205, Saturation 50%, Lightness 45%.
- Background color: An ethereal, light cool-white (#F0F6F8), visibly tinted with the primary hue but highly desaturated for a clean, open laboratory aesthetic. Hue 205, Saturation 20%, Lightness 95%.
- Accent color: A vibrant, expressive purple-blue (#6666ED) to highlight key actions and interactive elements, analogous to the primary while providing strong contrast. Hue 235, Saturation 70%, Lightness 60%.
- Headline font: 'Space Grotesk' (sans-serif) for a modern, tech-inspired, and impactful appearance.
- Body text font: 'Inter' (sans-serif) for exceptional readability and a neutral, objective presentation of inventory details and system information.
- Utilize sleek, outline-style vector icons that convey clarity and professionalism, consistent with a laboratory or technical environment. Icons should be easily discernible at various sizes.
- Implement a clear, two-panel or three-panel Discord-like layout with distinct navigation, channel view, and detail panes to ensure intuitive browsing and interaction, minimizing clutter.
- Subtle, fluid micro-interactions and transitions (e.g., item selection, QR code generation confirmation, inventory updates) to enhance user feedback and system responsiveness without being distracting.
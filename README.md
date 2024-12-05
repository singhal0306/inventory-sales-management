# Inventory Management System

An Inventory Management System built using the **MERN stack** (MongoDB, Express.js, React.js, Node.js) to efficiently manage inventory, create bills, handle sales, and monitor profits.

---

## Features

- **Add Items:** Easily add and manage items in the inventory.
- **Create Bills:** Generate detailed bills for customer purchases.
- **Handle Sales:** Track and process sales efficiently.
- **Monitor Profits:** Analyze profit data to make informed business decisions.

---

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Styling:** [Add your CSS framework/library, if any, e.g., TailwindCSS, Bootstrap]

---

## Installation and Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/singhal0306/inventory-sales-management.git
   cd inventory-sales-management
   ```

**2. Install dependencies:**

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

**3. Environment Variables:**

Create a `.env` file in the `backend` folder and add the following variables:

```makefile
MONGO_URI=<your-mongodb-uri>
PORT=<your-server-port>
```

Optionally, add API keys or other sensitive data as needed.

**4. Run the application:**

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd ../frontend
npm start
```

The application should now be running on `http://localhost:3000` (Frontend) and `http://localhost:<your-server-port>` (Backend).

**Usage:**
- Navigate to the application in your browser.
- Add items to the inventory.
- Generate bills for purchases.
- Track and monitor sales and profits through the dashboard.

**Screenshots:**
_Add screenshots of your app interface here._

**Contributing:**

Contributions are welcome! If you’d like to make improvements, please fork the repository, make your changes, and submit a pull request.

1. Fork the project.
2. Create your feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a pull request.

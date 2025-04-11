### Overall System Idea

The "Courier Admin Panel" is a comprehensive web-based platform designed to streamline the management of an e-commerce ecosystem focused on automotive parts or similar products. It integrates user management, order processing, product and category management, and role-specific analytics into a centralized system. Built with a React frontend, Express backend, and MongoDB database, the system supports multiple user roles—Admin, Seller, Courier, and Buyer—each with tailored functionalities to ensure efficient operation, tracking, and analysis of transactions and logistics. The platform emphasizes real-time data handling, hierarchical category structures, and detailed analytics to enhance decision-making and operational oversight.

The system operates as follows:
- **Admins** oversee the entire platform, managing users, orders, products, categories, and accessing comprehensive analytics.
- **Sellers** list and manage products, track their orders, and view performance analytics.
- **Couriers** handle order delivery, report issues, and monitor their delivery performance.
- **Buyers** browse products, place orders, and track their purchases.

---

### Functionalities by Role

#### Admin
Admins have full control over the system, acting as the overseers and maintainers of the platform.

- **User Management**:
    - **Admins**: View list, add new admins, delete existing admins.
    - **Couriers**: View list, add new couriers, update courier details (e.g., phone, region), delete couriers.
    - **Sellers**: View all sellers, view pending sellers (awaiting approval), approve new sellers, delete sellers.
    - **Buyers**: View list, delete buyers.

- **Order Oversight**:
    - View all orders with filters (status: Pending/Shipped/Delivered, district, date range).
    - Access detailed order information (buyer details, items, shipping address, courier status, status history).

- **Product Management**:
    - View all products with filters (status: active/inactive, category, seller ID).
    - Access detailed product information (title, price, stock, category, seller, etc.).

- **Category Management**:
    - View all categories in a hierarchical structure (parent categories with subcategories).
    - Add new categories (parent or subcategory).
    - Update existing categories (e.g., rename, reassign parent).
    - Delete categories.

- **Analytics**:
    - Access comprehensive analytics:
        - Total orders and revenue across the platform.
        - User counts by role (admins, couriers, sellers, buyers).
        - Order status breakdown (e.g., Shipped, Pending, Delivered).
        - Top products and top sellers by sales.
        - Courier performance (delivered vs. failed orders).

#### Seller
Sellers are responsible for listing products and managing their sales within the platform.

- **Product Management**:
    - Add new products (title, description, price, category, stock, condition, etc.).
    - Update existing product details.
    - Delete products from their inventory.
    - View their product listings with filters (e.g., stock level, status).

- **Order Management**:
    - View orders for their products with filters (status: Pending/Processing/Shipped/Delivered).
    - Update order status for their items (e.g., mark as Shipped).
    - Access detailed order information (buyer, items sold, total).

- **Analytics**:
    - View seller-specific analytics:
        - Total orders and revenue from their sales.
        - Order status breakdown (e.g., Shipped).
        - Top-selling products.
        - Low stock products (alerts for restocking).

#### Courier
Couriers focus on the logistics aspect, ensuring orders are delivered to buyers.

- **Order Management**:
    - View assigned orders with filters (status: Pending/Picked Up/In Transit/Out for Delivery/Delivered/Failed).
    - Update order status (e.g., Picked Up, In Transit, Delivered).
    - Report delivery issues (e.g., "Address not found") with a reason, reverting status to Shipped if failed.

- **Analytics**:
    - View courier-specific analytics:
        - Order status breakdown (total orders, pending, delivered, failed).
        - Success rate (percentage of successful deliveries).
        - Average delivery time (calculated from pickup to delivery).

#### Buyer
Buyers are the customers purchasing products through the platform.

- **Product Browsing**:
    - View all active products with filters (category, brand, condition, price range).
    - Access detailed product information (title, description, price, seller, stock).

- **Order Placement**:
    - Add products to cart and place orders.
    - Specify shipping address (street, city, district, country, postal code).

- **Order Tracking**:
    - View their order history with filters (status: Pending/Shipped/Delivered).
    - Track order status and courier details (tracking number, courier name).

- **Profile Management**:
    - Update personal details (name, email, phone).
    - View past purchases.

---

## Installation

Follow these steps to set up the Car Parts E-Commerce project locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sheronfdo/Car-Parts-E-Com.git
   ```

2. **Navigate to the project directory**:
   ```bash
   cd Car-Parts-E-Com
   ```

3. **Install backend dependencies**:
    - Assuming a Node.js/Express backend:
    ```bash
      cd backend  # Navigate to backend folder if it exists
      npm install
    ```

4. **Install frontend dependencies**:
    - Assuming a React frontend:
    ```bash
      cd ../frontend  # Navigate to frontend folder if it exists
      npm install
    ```

5. **Set up environment variables**:
    - Create a `.env` file in the `backend` directory with:
    ```bash
      MONGODB_URI=mongodb://localhost:27017/car-parts-ecom
      JWT_SECRET=your-secret-key
      PORT=3000
      ```
    - Adjust values based on your MongoDB setup and preferences.

6. **Start MongoDB**:
    - Ensure MongoDB is running locally:
    ```bash
      mongod
      ```

7. **Start the backend server**:
   ```bash
     cd backend
     npm start
   ```

8. **Start the frontend server**:
    - In a new terminal:
    ```bash
      cd frontend
      npm start
      ```
    - The app should now be accessible at `http://localhost:3000`.


## Contributing

Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch for your changes.
3. Submit a pull request.

## Contact

For questions, feedback, or support, please reach out to Sheron Fernando via [GitHub](https://github.com/sheronfdo) or email at jamithsheron5@gmail.com.

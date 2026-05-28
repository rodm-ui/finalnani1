import { useEffect, useMemo, useState } from "react";

// --- Types ---

type Role = "admin" | "customer";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  password: string;
};

type Category = {
  id: string;
  name: string;
  description?: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  pricePhp: number;
  imageUrl: string;
  categoryId: string;
  isFeatured?: boolean;
};

type OrderItem = {
  productId: string;
  quantity: number;
  unitPricePhp: number;
};

type PaymentMethod = "Cash" | "E-Wallet";

type OrderType = "Pickup" | "Delivery";

type OrderStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

type Order = {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmountPhp: number;
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  status: OrderStatus;
  note?: string;
  /** Delivery address when orderType is "Delivery" */
  deliveryAddress?: string;
  createdAt: string;
};

type AppearanceSettings = {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: "gradient" | "solid";
  heroTagline: string;
};

type ContactInfo = {
  phone: string;
  email: string;
  address: string;
  facebook?: string;
  instagram?: string;
};

// --- Storage helpers ---

const STORAGE_KEYS = {
  users: "bloomery_users",
  products: "bloomery_products",
  categories: "bloomery_categories",
  orders: "bloomery_orders",
  settings: "bloomery_settings",
  contact: "bloomery_contact",
  currentUser: "bloomery_current_user",
} as const;

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function formatPhp(value: number) {
  return value.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });
}

// --- Initial data ---

const defaultCategories: Category[] = [
  {
    id: "romantic",
    name: "Romantic Bouquets",
    description: "Roses and blooms for anniversaries and date nights.",
  },
  {
    id: "birthday",
    name: "Birthday Bouquets",
    description: "Bright arrangements to celebrate special days.",
  },
  {
    id: "sympathy",
    name: "Sympathy & Get Well",
    description: "Soft, comforting bouquets for thoughtful support.",
  },
  {
    id: "custom",
    name: "Custom Creations",
    description: "Design-your-own floral stories.",
  },
];

const defaultProducts: Product[] = [
  {
    id: "rosy-dreams",
    name: "Rosy Dreams Bouquet",
    description: "A classic dozen red roses with eucalyptus and baby's breath.",
    pricePhp: 1899,
    imageUrl:
      "https://images.pexels.com/photos/1028725/pexels-photo-1028725.jpeg?auto=compress&cs=tinysrgb&w=800",
    categoryId: "romantic",
    isFeatured: true,
  },
  {
    id: "sunrise-smiles",
    name: "Sunrise Smiles",
    description: "Sunflowers and gerberas wrapped in kraft paper for a bright surprise.",
    pricePhp: 1499,
    imageUrl:
      "https://images.pexels.com/photos/139252/pexels-photo-139252.jpeg?auto=compress&cs=tinysrgb&w=800",
    categoryId: "birthday",
    isFeatured: true,
  },
  {
    id: "gentle-comfort",
    name: "Gentle Comfort",
    description: "White lilies, mums, and foliage in a soft pastel wrap.",
    pricePhp: 1599,
    imageUrl:
      "https://images.pexels.com/photos/21227/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800",
    categoryId: "sympathy",
  },
  {
    id: "bloomery-signature",
    name: "BlooMery Signature Box",
    description: "Curated seasonal blooms in a BlooMery keepsake box.",
    pricePhp: 2299,
    imageUrl:
      "https://images.pexels.com/photos/931162/pexels-photo-931162.jpeg?auto=compress&cs=tinysrgb&w=800",
    categoryId: "custom",
    isFeatured: true,
  },
];

const defaultSettings: AppearanceSettings = {
  primaryColor: "rose-600",
  accentColor: "pink-500",
  backgroundStyle: "gradient",
  heroTagline: "Fresh, hand-tied bouquets for every story you want to tell.",
};

const defaultContact: ContactInfo = {
  phone: "+63 917 123 4567",
  email: "hello@bloomery.ph",
  address: "123 Bloom Lane, Quezon City, Metro Manila",
  facebook: "facebook.com/BlooMeryPH",
  instagram: "@bloomery.ph",
};

// --- Small UI helpers ---

function classNames(...classes: Array<string | boolean | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// --- Auth & main app ---

export default function App() {
  const [users, setUsers] = useState<User[]>(() => {
    const existing = loadFromStorage<User[]>(STORAGE_KEYS.users, []);
    if (!existing.some((u) => u.role === "admin")) {
      const admin: User = {
        id: generateId("user"),
        name: "BlooMery Admin",
        email: "admin@bloomery.ph",
        role: "admin",
        password: "admin123",
      };
      const updated = [...existing, admin];
      saveToStorage(STORAGE_KEYS.users, updated);
      return updated;
    }
    return existing;
  });

  const [categories, setCategories] = useState<Category[]>(() =>
    loadFromStorage<Category[]>(STORAGE_KEYS.categories, defaultCategories)
  );

  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage<Product[]>(STORAGE_KEYS.products, defaultProducts)
  );

  const [orders, setOrders] = useState<Order[]>(() =>
    loadFromStorage<Order[]>(STORAGE_KEYS.orders, [])
  );

  const [settings, setSettings] = useState<AppearanceSettings>(() =>
    loadFromStorage<AppearanceSettings>(STORAGE_KEYS.settings, defaultSettings)
  );

  const [contact, setContact] = useState<ContactInfo>(() =>
    loadFromStorage<ContactInfo>(STORAGE_KEYS.contact, defaultContact)
  );

  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    loadFromStorage<User | null>(STORAGE_KEYS.currentUser, null)
  );

  const [activeCustomerPage, setActiveCustomerPage] = useState<"shop" | "orders">(
    "shop"
  );

  const [authError, setAuthError] = useState<string | null>(null);
  const [justPlacedOrderId, setJustPlacedOrderId] = useState<string | null>(null);

  // Persist core state
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.users, users);
  }, [users]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.categories, categories);
  }, [categories]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.products, products);
  }, [products]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.orders, orders);
  }, [orders]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.settings, settings);
  }, [settings]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.contact, contact);
  }, [contact]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.currentUser, currentUser);
  }, [currentUser]);

  const featuredProducts = useMemo(
    () => products.filter((p) => p.isFeatured),
    [products]
  );

  const currentUserOrders = useMemo(() => {
    if (!currentUser) return [] as Order[];
    if (currentUser.role === "admin") return orders;
    return orders.filter((o) => o.customerId === currentUser.id);
  }, [orders, currentUser]);

  function handleLogin(email: string, password: string) {
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) {
      setAuthError("Invalid email or password.");
      return;
    }
    setCurrentUser(found);
    setAuthError(null);
  }

  function handleRegisterCustomer(name: string, email: string, password: string) {
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setAuthError("An account with that email already exists.");
      return;
    }
    const newUser: User = {
      id: generateId("user"),
      name,
      email,
      role: "customer",
      password,
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    setAuthError(null);
  }

  function handleLogout() {
    setCurrentUser(null);
  }

  function handlePlaceOrder(input: {
    items: OrderItem[];
    paymentMethod: PaymentMethod;
    orderType: OrderType;
    note?: string;
    deliveryAddress?: string;
  }) {
    if (!currentUser) return;
    const total = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPricePhp,
      0
    );
    const order: Order = {
      id: generateId("order"),
      customerId: currentUser.id,
      customerName: currentUser.name,
      items: input.items,
      totalAmountPhp: total,
      paymentMethod: input.paymentMethod,
      orderType: input.orderType,
      status: "Pending",
      note: input.note,
      deliveryAddress: input.deliveryAddress,
      createdAt: new Date().toISOString(),
    };
    setOrders((prev) => [order, ...prev]);
    setJustPlacedOrderId(order.id);
  }

  function handleUpdateOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
            }
          : o
      )
    );
  }

  function handleUpsertCategory(category: Category) {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      if (exists) return prev.map((c) => (c.id === category.id ? category : c));
      return [...prev, category];
    });
  }

  function handleDeleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setProducts((prev) => prev.filter((p) => p.categoryId !== id));
  }

  function handleUpsertProduct(product: Product) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) return prev.map((p) => (p.id === product.id ? product : p));
      return [...prev, product];
    });
  }

  function handleDeleteProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function handleUpdateSettings(next: AppearanceSettings) {
    setSettings(next);
  }

  function handleUpdateContact(next: ContactInfo) {
    setContact(next);
  }

  const isAdmin = currentUser?.role === "admin";

  const heroBackground =
    settings.backgroundStyle === "gradient"
      ? "bg-gradient-to-br from-rose-50 via-white to-pink-50"
      : "bg-rose-50";

  return (
    <div
      className={classNames(
        "min-h-screen text-slate-900 flex flex-col",
        heroBackground
      )}
    >
      {!currentUser ? (
        <AuthScreen
          onLogin={handleLogin}
          onRegisterCustomer={handleRegisterCustomer}
          authError={authError}
        />
      ) : (
        <>
          <Header
            user={currentUser}
            isAdmin={isAdmin}
            onLogout={handleLogout}
            heroTagline={settings.heroTagline}
            contact={contact}
            activeCustomerPage={activeCustomerPage}
            onChangeCustomerPage={setActiveCustomerPage}
          />

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-10 pt-4">
            {isAdmin ? (
              <AdminDashboard
                users={users}
                products={products}
                categories={categories}
                orders={orders}
                settings={settings}
                contact={contact}
                onUpsertProduct={handleUpsertProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpsertCategory={handleUpsertCategory}
                onDeleteCategory={handleDeleteCategory}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onUpdateSettings={handleUpdateSettings}
                onUpdateContact={handleUpdateContact}
              />
            ) : (
              <CustomerArea
                products={products}
                categories={categories}
                featuredProducts={featuredProducts}
                orders={currentUserOrders}
                activePage={activeCustomerPage}
                onChangePage={setActiveCustomerPage}
                onPlaceOrder={handlePlaceOrder}
                justPlacedOrderId={justPlacedOrderId}
                onClearJustPlacedOrder={() => setJustPlacedOrderId(null)}
              />
            )}
          </main>

          <footer className="border-t border-rose-100 bg-white/60 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                © {new Date().getFullYear()} BlooMery Flower Shop · All rights reserved.
              </span>
              <span>
                Prices shown in Philippine Peso ({""}
                <span className="font-semibold">PHP</span>) for Metro Manila.
              </span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

// --- Auth screen ---

type AuthScreenProps = {
  onLogin: (email: string, password: string) => void;
  onRegisterCustomer: (name: string, email: string, password: string) => void;
  authError: string | null;
};

function AuthScreen({ onLogin, onRegisterCustomer, authError }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login") {
      onLogin(email, password);
    } else {
      if (!name.trim()) return;
      onRegisterCustomer(name.trim(), email, password);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-10 rounded-3xl bg-white/80 p-8 shadow-xl shadow-rose-100 backdrop-blur-lg md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:p-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white">
              BF
            </span>
            <span>BlooMery Flower Shop · Quezon City, PH</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            BlooMery Flower Shop
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-600">
            Browse hand-crafted flower bouquets, order in a few taps, and track your
            orders. Admins can manage products, categories, appearance, and all
            customer orders from a single dashboard.
          </p>
          <dl className="grid grid-cols-2 gap-4 text-xs text-slate-600 sm:grid-cols-3">
            <div className="rounded-2xl bg-rose-50 p-3">
              <dt className="font-semibold text-rose-700">Same-day delivery</dt>
              <dd>Order before 3 PM within Metro Manila.</dd>
            </div>
            <div className="rounded-2xl bg-pink-50 p-3">
              <dt className="font-semibold text-pink-700">E-wallet ready</dt>
              <dd>Pay via GCash or Maya (simulated at checkout).</dd>
            </div>
            <div className="rounded-2xl bg-rose-50 p-3">
              <dt className="font-semibold text-rose-700">Admin dashboard</dt>
              <dd>Manage bouquets, categories, and all orders.</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 ring-1 ring-rose-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Admin default login: admin@bloomery.ph / admin123</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="mb-4 flex rounded-full bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={classNames(
                "flex-1 rounded-full px-3 py-1.5 transition",
                mode === "login" ? "bg-white text-slate-900 shadow" : "text-slate-500"
              )}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={classNames(
                "flex-1 rounded-full px-3 py-1.5 transition",
                mode === "register" ? "bg-white text-slate-900 shadow" : "text-slate-500"
              )}
            >
              Create customer account
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-rose-100"
          >
            {mode === "register" && (
              <div className="space-y-1 text-xs">
                <label className="font-medium text-slate-700" htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1 text-xs">
              <label className="font-medium text-slate-700" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-600">{authError}</p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
            >
              {mode === "login" ? "Sign in" : "Create account & continue"}
            </button>

            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Use the admin account above to access the full dashboard, or register as a
              customer to browse bouquets and place orders.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- Header ---

type HeaderProps = {
  user: User;
  isAdmin: boolean;
  onLogout: () => void;
  heroTagline: string;
  contact: ContactInfo;
  activeCustomerPage: "shop" | "orders";
  onChangeCustomerPage: (page: "shop" | "orders") => void;
};

function Header({
  user,
  isAdmin,
  onLogout,
  heroTagline,
  contact,
  activeCustomerPage,
  onChangeCustomerPage,
}: HeaderProps) {
  return (
    <header className="border-b border-rose-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-200">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path
                d="M12 2c-1.8 0-3.5.7-4.7 2-1.2 1.3-1.9 3-1.9 4.8 0 1.2.3 2.3.9 3.4L12 22l5.7-9.8c.6-1 .9-2.2.9-3.4 0-1.8-.7-3.5-1.9-4.8C15.5 2.7 13.8 2 12 2zm0 6.4c-.9 0-1.6-.7-1.6-1.6S11.1 5.2 12 5.2s1.6.7 1.6 1.6S12.9 8.4 12 8.4z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-slate-900">
                BlooMery Flower Shop
              </h1>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-100">
                {isAdmin ? "Admin" : "Customer"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-1">{heroTagline}</p>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-between gap-3 sm:justify-end">
          {!isAdmin && (
            <nav className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => onChangeCustomerPage("shop")}
                className={classNames(
                  "rounded-full px-3 py-1 transition",
                  activeCustomerPage === "shop"
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-500"
                )}
              >
                Shop bouquets
              </button>
              <button
                type="button"
                onClick={() => onChangeCustomerPage("orders")}
                className={classNames(
                  "rounded-full px-3 py-1 transition",
                  activeCustomerPage === "orders"
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-500"
                )}
              >
                My orders
              </button>
            </nav>
          )}

          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <div className="hidden flex-col sm:flex">
              <span className="font-medium">{contact.phone}</span>
              <span className="text-[10px] text-slate-500">Call / Viber for rush orders</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
              <span className="hidden text-[10px] text-slate-500 sm:inline">
                Signed in as
              </span>
              <span className="text-xs font-medium text-slate-800">
                {user.name}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="ml-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-600 shadow-sm ring-1 ring-rose-100 hover:bg-rose-50"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// --- Customer area ---

type CustomerAreaProps = {
  products: Product[];
  categories: Category[];
  featuredProducts: Product[];
  orders: Order[];
  activePage: "shop" | "orders";
  onChangePage: (page: "shop" | "orders") => void;
  onPlaceOrder: (input: {
    items: OrderItem[];
    paymentMethod: PaymentMethod;
    orderType: OrderType;
    note?: string;
    deliveryAddress?: string;
  }) => void;
  justPlacedOrderId: string | null;
  onClearJustPlacedOrder: () => void;
};

function CustomerArea({
  products,
  categories,
  featuredProducts,
  orders,
  activePage,
  onChangePage,
  onPlaceOrder,
  justPlacedOrderId,
  onClearJustPlacedOrder,
}: CustomerAreaProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | "all">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("E-Wallet");
  const [orderType, setOrderType] = useState<OrderType>("Delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (
        selectedCategoryId !== "all" &&
        product.categoryId !== selectedCategoryId
      ) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategoryId, search]);

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPricePhp,
        0
      ),
    [cartItems]
  );

  function addToCart(product: Product) {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: 1,
          unitPricePhp: product.pricePhp,
        },
      ];
    });
  }

  function updateCartQuantity(productId: string, quantity: number) {
    setCartItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.productId !== productId);
      return prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      );
    });
  }

  function clearCart() {
    setCartItems([]);
  }

  function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cartItems.length) return;
    if (orderType === "Delivery" && !deliveryAddress.trim()) {
      setCheckoutError("Please enter a delivery address for your order.");
      return;
    }
    setCheckoutError(null);
    onPlaceOrder({
      items: cartItems,
      paymentMethod,
      orderType,
      note,
      deliveryAddress:
        orderType === "Delivery" ? deliveryAddress.trim() : undefined,
    });
    clearCart();
    setShowCheckout(false);
    setNote("");
    setDeliveryAddress("");
    setPaymentMethod("E-Wallet");
    setOrderType("Delivery");
    onChangePage("orders");
  }

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  useEffect(() => {
    if (justPlacedOrderId) {
      const timeout = setTimeout(onClearJustPlacedOrder, 5000);
      return () => clearTimeout(timeout);
    }
  }, [justPlacedOrderId, onClearJustPlacedOrder]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      {activePage === "shop" ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Flower bouquets
            </h2>
            <p className="text-xs text-slate-500">
              All prices are in Philippine Peso ({""}
              <span className="font-semibold">PHP</span>) and already adjusted from
              USD-based pricing.
            </p>
          </div>

          {featuredProducts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                Featured bouquets
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {featuredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                        BlooMery favorite
                      </div>
                    </div>
                    <div className="space-y-1.5 p-3">
                      <h4 className="text-xs font-semibold text-slate-900">
                        {product.name}
                      </h4>
                      <p className="line-clamp-2 text-[11px] text-slate-500">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-semibold text-rose-700">
                          {formatPhp(product.pricePhp)}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="rounded-full bg-rose-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-700"
                        >
                          Add to cart
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-rose-100">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedCategoryId("all")}
                className={classNames(
                  "rounded-full px-3 py-1 ring-1",
                  selectedCategoryId === "all"
                    ? "bg-rose-600 text-white ring-rose-600"
                    : "bg-rose-50 text-rose-700 ring-rose-100"
                )}
              >
                All bouquets
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={classNames(
                    "rounded-full px-3 py-1 text-[11px] ring-1",
                    selectedCategoryId === cat.id
                      ? "bg-rose-600 text-white ring-rose-600"
                      : "bg-slate-50 text-slate-700 ring-slate-200"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <input
                placeholder="Search bouquets..."
                className="w-40 rounded-full border border-slate-200 px-3 py-1 text-[11px] shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 sm:w-52"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <div className="relative h-32">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] text-white backdrop-blur">
                    {categories.find((c) => c.id === product.categoryId)?.name ??
                      "Bouquet"}
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between space-y-2 p-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-slate-900">
                      {product.name}
                    </h3>
                    <p className="line-clamp-2 text-[11px] text-slate-500">
                      {product.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs">
                      <div className="font-semibold text-rose-700">
                        {formatPhp(product.pricePhp)}
                      </div>
                      <div className="text-[10px] text-slate-500">Incl. wrapping</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="rounded-full bg-rose-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {filteredProducts.length === 0 && (
              <p className="col-span-full rounded-2xl bg-white p-4 text-center text-xs text-slate-500 ring-1 ring-slate-200">
                No bouquets match your search. Try a different keyword or category.
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              My orders
            </h2>
            <p className="text-xs text-slate-500">
              Track your bouquet orders and check their status.
            </p>
          </div>
          <div className="space-y-2">
            {orders.length === 0 && (
              <p className="rounded-2xl bg-white p-4 text-center text-xs text-slate-500 ring-1 ring-slate-200">
                You have no orders yet. Start by adding a bouquet to your cart.
              </p>
            )}
            <div className="space-y-2">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className={classNames(
                    "rounded-2xl bg-white p-3 text-xs ring-1",
                    order.status === "Pending"
                      ? "ring-amber-200"
                      : order.status === "Confirmed"
                      ? "ring-sky-200"
                      : order.status === "Completed"
                      ? "ring-emerald-200"
                      : "ring-rose-200"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                        {order.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(order.createdAt).toLocaleString("en-PH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <span
                      className={classNames(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        order.status === "Pending"
                          ? "bg-amber-50 text-amber-700"
                          : order.status === "Confirmed"
                          ? "bg-sky-50 text-sky-700"
                          : order.status === "Completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      )}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-rose-700">
                          {formatPhp(order.totalAmountPhp)}
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                          <span>{order.paymentMethod}</span>
                          <span>·</span>
                          <span>{order.orderType}</span>
                          {order.note && (
                            <>
                              <span>·</span>
                              <span className="line-clamp-1">Note: {order.note}</span>
                            </>
                          )}
                        </div>
                        {order.orderType === "Delivery" && order.deliveryAddress && (
                          <p className="text-[10px] text-slate-500">
                            Deliver to: {order.deliveryAddress}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                        {order.items.map((item) => {
                          const product = productsById.get(item.productId);
                          return (
                            <span
                              key={item.productId}
                              className="rounded-full bg-slate-100 px-2 py-0.5"
                            >
                              {item.quantity}× {product?.name ?? "Bouquet"}
                            </span>
                          );
                        })}
                      </div>
                  </div>
                  {justPlacedOrderId === order.id && (
                    <p className="mt-2 rounded-xl bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">
                      Your order was placed successfully! Admin can now confirm and
                      prepare your bouquet.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Order summary / checkout */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Order summary
          </h2>
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] text-slate-500 hover:text-rose-600"
            >
              Clear cart
            </button>
          )}
        </div>
        <div className="space-y-3 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-rose-100">
          {cartItems.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              Your cart is empty. Add a bouquet to begin your order.
            </p>
          ) : (
            <div className="space-y-2">
              <ul className="space-y-1">
                {cartItems.map((item) => {
                  const product = productsById.get(item.productId);
                  if (!product) return null;
                  return (
                    <li
                      key={item.productId}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-slate-900">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  item.productId,
                                  item.quantity - 1
                                )
                              }
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] hover:bg-slate-200"
                            >
                              -
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  item.productId,
                                  item.quantity + 1
                                )
                              }
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] hover:bg-slate-200"
                            >
                              +
                            </button>
                          </div>
                          <span>·</span>
                          <span>{formatPhp(item.unitPricePhp)}</span>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-rose-700">
                        {formatPhp(item.unitPricePhp * item.quantity)}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                <span className="text-[11px] text-slate-500">
                  Estimated total (PHP)
                </span>
                <span className="text-sm font-semibold text-rose-700">
                  {formatPhp(cartTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowCheckout(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
              >
                Proceed to checkout
              </button>

              <p className="text-[10px] text-slate-500">
                Payments are simulated for demo purposes. Choose Cash or E-Wallet
                (GCash / Maya) and confirm your order. Admin will see it instantly in
                the dashboard.
              </p>
            </div>
          )}
        </div>

        {showCheckout && cartItems.length > 0 && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4 py-6">
            <form
              onSubmit={handleCheckoutSubmit}
              className="w-full max-w-md space-y-3 rounded-2xl bg-white p-4 text-xs shadow-xl ring-1 ring-rose-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Checkout
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">
                    Payment method
                  </label>
                  <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("E-Wallet")}
                      className={classNames(
                        "flex-1 rounded-md px-2 py-1 text-[11px]",
                        paymentMethod === "E-Wallet"
                          ? "bg-white text-slate-900 shadow"
                          : "text-slate-500"
                      )}
                    >
                      E-Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Cash")}
                      className={classNames(
                        "flex-1 rounded-md px-2 py-1 text-[11px]",
                        paymentMethod === "Cash"
                          ? "bg-white text-slate-900 shadow"
                          : "text-slate-500"
                      )}
                    >
                      Cash
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">
                    Order type
                  </label>
                  <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOrderType("Delivery");
                        setCheckoutError(null);
                      }}
                      className={classNames(
                        "flex-1 rounded-md px-2 py-1 text-[11px]",
                        orderType === "Delivery"
                          ? "bg-white text-slate-900 shadow"
                          : "text-slate-500"
                      )}
                    >
                      Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrderType("Pickup");
                        setCheckoutError(null);
                      }}
                      className={classNames(
                        "flex-1 rounded-md px-2 py-1 text-[11px]",
                        orderType === "Pickup"
                          ? "bg-white text-slate-900 shadow"
                          : "text-slate-500"
                      )}
                    >
                      Pickup
                    </button>
                  </div>
                </div>
              </div>

              {orderType === "Delivery" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">
                    Delivery address
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    placeholder="House / unit, street, barangay, city (e.g., Quezon City)"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-700">
                  Notes for BlooMery (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  placeholder="Example: Deliver before 2 PM, pastel wrapping, recipient is in Building B."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {checkoutError && (
                <p className="text-[10px] text-rose-600">{checkoutError}</p>
              )}

              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                <div className="text-[11px] text-slate-500">
                  <div>Order total</div>
                  <div className="font-semibold text-rose-700">
                    {formatPhp(cartTotal)}
                  </div>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
                >
                  Place order
                </button>
              </div>

              <p className="text-[10px] text-slate-500">
                After confirming, your order will appear in the admin dashboard with
                status <span className="font-semibold">Pending</span>. Admin can then
                mark it as Confirmed or Completed.
              </p>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

// --- Admin dashboard ---

type AdminDashboardProps = {
  users: User[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  settings: AppearanceSettings;
  contact: ContactInfo;
  onUpsertProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpsertCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onUpdateSettings: (settings: AppearanceSettings) => void;
  onUpdateContact: (contact: ContactInfo) => void;
};

function AdminDashboard({
  users,
  products,
  categories,
  orders,
  settings,
  contact,
  onUpsertProduct,
  onDeleteProduct,
  onUpsertCategory,
  onDeleteCategory,
  onUpdateOrderStatus,
  onUpdateSettings,
  onUpdateContact,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "categories" | "orders" | "appearance" | "users"
  >("overview");

  const totalRevenue = useMemo(
    () =>
      orders
        .filter((o) => o.status === "Completed")
        .reduce((sum, o) => sum + o.totalAmountPhp, 0),
    [orders]
  );

  const openOrders = orders.filter(
    (o) => o.status === "Pending" || o.status === "Confirmed"
  );

  const customers = users.filter((u) => u.role === "customer");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Admin dashboard
          </h2>
          <p className="text-xs text-slate-500">
            Manage your BlooMery storefront, bouquets, appearance, and all orders.
          </p>
        </div>
        <nav className="flex flex-wrap gap-1 text-[11px]">
          {[
            ["overview", "Overview"],
            ["products", "Products"],
            ["categories", "Categories"],
            ["orders", "Orders"],
            ["appearance", "Appearance"],
            ["users", "Users"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setActiveTab(key as AdminDashboardProps["settings"] extends never
                  ? never
                  : any)
              }
              className={classNames(
                "rounded-full px-3 py-1",
                activeTab === key
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-rose-100">
              <div className="text-[11px] text-slate-500">Total orders</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {orders.length}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                {openOrders.length} open / pending
              </div>
            </div>
            <div className="rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-emerald-100">
              <div className="text-[11px] text-slate-500">Completed revenue</div>
              <div className="mt-1 text-lg font-semibold text-emerald-700">
                {formatPhp(totalRevenue)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">PHP only</div>
            </div>
            <div className="rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-sky-100">
              <div className="text-[11px] text-slate-500">Active customers</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {customers.length}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Registered accounts
              </div>
            </div>
            <div className="rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-pink-100">
              <div className="text-[11px] text-slate-500">Products live</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {products.length}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Across {categories.length} categories
              </div>
            </div>
          </div>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="space-y-2 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900">
                  Latest orders
                </h3>
                <span className="text-[10px] text-slate-500">
                  {orders.length} total
                </span>
              </div>
              {orders.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  No orders yet. Once customers place orders, you will see them here.
                </p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {orders.slice(0, 6).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-1.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500">
                            {order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[11px] font-medium text-slate-800">
                            {order.customerName}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                          <span>{order.orderType}</span>
                          <span>·</span>
                          <span>{order.paymentMethod}</span>
                          <span>·</span>
                          <span>
                            {order.items.reduce(
                              (qty, item) => qty + item.quantity,
                              0
                            )}{" "}
                            item(s)
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-rose-700">
                          {formatPhp(order.totalAmountPhp)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {order.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xs font-semibold text-slate-900">
                Store details
              </h3>
              <dl className="space-y-1 text-[11px] text-slate-600">
                <div>
                  <dt className="font-medium text-slate-700">Contact</dt>
                  <dd>
                    <div>{contact.phone}</div>
                    <div>{contact.email}</div>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Address</dt>
                  <dd>{contact.address}</dd>
                </div>
                <div className="flex gap-4">
                  {contact.facebook && (
                    <div>
                      <dt className="font-medium text-slate-700">Facebook</dt>
                      <dd>{contact.facebook}</dd>
                    </div>
                  )}
                  {contact.instagram && (
                    <div>
                      <dt className="font-medium text-slate-700">Instagram</dt>
                      <dd>{contact.instagram}</dd>
                    </div>
                  )}
                </div>
              </dl>
              <p className="mt-1 text-[10px] text-slate-500">
                Edit these details under the Appearance tab to update what customers see
                on the storefront.
              </p>
            </div>
          </section>
        </section>
      )}

      {activeTab === "products" && (
        <AdminProductsTab
          products={products}
          categories={categories}
          onUpsertProduct={onUpsertProduct}
          onDeleteProduct={onDeleteProduct}
        />
      )}

      {activeTab === "categories" && (
        <AdminCategoriesTab
          categories={categories}
          onUpsertCategory={onUpsertCategory}
          onDeleteCategory={onDeleteCategory}
        />
      )}

      {activeTab === "orders" && (
        <AdminOrdersTab
          orders={orders}
          onUpdateOrderStatus={onUpdateOrderStatus}
          products={products}
        />
      )}

      {activeTab === "appearance" && (
        <AdminAppearanceTab
          settings={settings}
          contact={contact}
          onUpdateSettings={onUpdateSettings}
          onUpdateContact={onUpdateContact}
        />
      )}

      {activeTab === "users" && <AdminUsersTab users={users} />}
    </div>
  );
}

// --- Admin: Products ---

type AdminProductsTabProps = {
  products: Product[];
  categories: Category[];
  onUpsertProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
};

function AdminProductsTab({
  products,
  categories,
  onUpsertProduct,
  onDeleteProduct,
}: AdminProductsTabProps) {
  const [editing, setEditing] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [pricePhp, setPricePhp] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    if (!editing) {
      setName("");
      setPricePhp("");
      setCategoryId(categories[0]?.id ?? "");
      setDescription("");
      setImageUrl("");
      setIsFeatured(false);
    } else {
      setName(editing.name);
      setPricePhp(String(editing.pricePhp));
      setCategoryId(editing.categoryId);
      setDescription(editing.description);
      setImageUrl(editing.imageUrl);
      setIsFeatured(Boolean(editing.isFeatured));
    }
  }, [editing, categories]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numericPrice = Number(pricePhp);
    if (!name.trim() || !categoryId || isNaN(numericPrice) || numericPrice <= 0) {
      return;
    }
    const product: Product = {
      id: editing?.id ?? generateId("product"),
      name: name.trim(),
      description: description.trim() || "Beautiful hand-arranged bouquet.",
      pricePhp: Math.round(numericPrice),
      imageUrl:
        imageUrl.trim() ||
        "https://images.pexels.com/photos/931175/pexels-photo-931175.jpeg?auto=compress&cs=tinysrgb&w=800",
      categoryId,
      isFeatured,
    };
    onUpsertProduct(product);
    setEditing(null);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="space-y-2 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900">Products</h3>
          <span className="text-[10px] text-slate-500">{products.length} live</span>
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-8 w-8 rounded-lg object-cover"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-slate-900">
                      {product.name}
                    </span>
                    {product.isFeatured && (
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                    <span>
                      {
                        categories.find((c) => c.id === product.categoryId)?.name ??
                        "Uncategorized"
                      }
                    </span>
                    <span>·</span>
                    <span>{formatPhp(product.pricePhp)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setEditing(product)}
                  className="rounded-full bg-white px-2 py-0.5 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteProduct(product.id)}
                  className="rounded-full bg-white px-2 py-0.5 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p className="text-[11px] text-slate-500">
              No products yet. Use the form on the right to add your first bouquet.
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-rose-200"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900">
            {editing ? "Edit bouquet" : "Add bouquet"}
          </h3>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-[10px] text-slate-500 hover:text-rose-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Name
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700">
              Price (PHP)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={pricePhp}
              onChange={(e) => setPricePhp(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700">
              Category
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Photo URL
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            placeholder="Paste an image URL (optional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-[11px] text-slate-600">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          Mark as featured bouquet on the storefront
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
        >
          {editing ? "Save changes" : "Add bouquet"}
        </button>

        <p className="text-[10px] text-slate-500">
          Prices are stored and displayed in Philippine Peso (PHP). If you previously
          priced in USD, multiply by the current USD→PHP rate and save the converted
          amount here.
        </p>
      </form>
    </section>
  );
}

// --- Admin: Categories ---

type AdminCategoriesTabProps = {
  categories: Category[];
  onUpsertCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
};

function AdminCategoriesTab({
  categories,
  onUpsertCategory,
  onDeleteCategory,
}: AdminCategoriesTabProps) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!editing) {
      setName("");
      setDescription("");
    } else {
      setName(editing.name);
      setDescription(editing.description ?? "");
    }
  }, [editing]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const category: Category = {
      id: editing?.id ?? generateId("category"),
      name: name.trim(),
      description: description.trim() || undefined,
    };
    onUpsertCategory(category);
    setEditing(null);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-2 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900">Categories</h3>
          <span className="text-[10px] text-slate-500">
            {categories.length} total
          </span>
        </div>
        <div className="space-y-1">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-1.5"
            >
              <div>
                <div className="text-xs font-medium text-slate-900">
                  {category.name}
                </div>
                {category.description && (
                  <div className="text-[10px] text-slate-500">
                    {category.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setEditing(category)}
                  className="rounded-full bg-white px-2 py-0.5 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCategory(category.id)}
                  className="rounded-full bg-white px-2 py-0.5 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-[11px] text-slate-500">
              No categories yet. Use the form on the right to add your first bouquet
              category.
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-rose-200"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900">
            {editing ? "Edit category" : "Add category"}
          </h3>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-[10px] text-slate-500 hover:text-rose-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Name
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Description (optional)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
        >
          {editing ? "Save changes" : "Add category"}
        </button>

        <p className="text-[10px] text-slate-500">
          Use categories like Romantic, Birthday, Sympathy, or Custom to group your
          bouquets for customers.
        </p>
      </form>
    </section>
  );
}

// --- Admin: Orders ---

type AdminOrdersTabProps = {
  orders: Order[];
  products: Product[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
};

function AdminOrdersTab({
  orders,
  products,
  onUpdateOrderStatus,
}: AdminOrdersTabProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const filteredOrders = orders.filter((order) =>
    statusFilter === "all" ? true : order.status === statusFilter
  );

  return (
    <section className="space-y-3 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-900">Orders</h3>
          <p className="text-[11px] text-slate-500">
            View and change order status from Pending to Confirmed or Completed.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-[11px]">
          {["all", "Pending", "Confirmed", "Completed", "Cancelled"].map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setStatusFilter(status as OrderStatus | "all")
                }
                className={classNames(
                  "rounded-full px-2 py-1",
                  statusFilter === status
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-500"
                )}
              >
                {status}
              </button>
            )
          )}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-[11px] text-slate-500">
          No orders for this status yet.
        </p>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="space-y-1 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-mono text-slate-600">
                    {order.id.slice(-6).toUpperCase()}
                  </span>
                  <div>
                    <div className="text-xs font-medium text-slate-900">
                      {order.customerName}
                    </div>
                    <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                      <span>{order.orderType}</span>
                      <span>·</span>
                      <span>{order.paymentMethod}</span>
                      <span>·</span>
                      <span>
                        {new Date(order.createdAt).toLocaleString("en-PH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-rose-700">
                    {formatPhp(order.totalAmountPhp)}
                  </div>
                  <select
                    className="mt-0.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px]"
                    value={order.status}
                    onChange={(e) =>
                      onUpdateOrderStatus(
                        order.id,
                        e.target.value as OrderStatus
                      )
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 text-[10px] text-slate-600">
                {order.items.map((item) => {
                  const product = productsById.get(item.productId);
                  return (
                    <span
                      key={item.productId + item.quantity}
                      className="rounded-full bg-white px-2 py-0.5"
                    >
                      {item.quantity}× {product?.name ?? "Bouquet"}
                    </span>
                  );
                })}
              </div>

              {order.orderType === "Delivery" && order.deliveryAddress && (
                <p className="text-[10px] text-slate-500">
                  Deliver to: {order.deliveryAddress}
                </p>
              )}

              {order.note && (
                <p className="text-[10px] text-slate-500">
                  Note: {order.note}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// --- Admin: Appearance & contact ---

type AdminAppearanceTabProps = {
  settings: AppearanceSettings;
  contact: ContactInfo;
  onUpdateSettings: (settings: AppearanceSettings) => void;
  onUpdateContact: (contact: ContactInfo) => void;
};

function AdminAppearanceTab({
  settings,
  contact,
  onUpdateSettings,
  onUpdateContact,
}: AdminAppearanceTabProps) {
  const [heroTagline, setHeroTagline] = useState(settings.heroTagline);
  const [backgroundStyle, setBackgroundStyle] = useState<
    AppearanceSettings["backgroundStyle"]
  >(settings.backgroundStyle);

  const [phone, setPhone] = useState(contact.phone);
  const [email, setEmail] = useState(contact.email);
  const [address, setAddress] = useState(contact.address);
  const [facebook, setFacebook] = useState(contact.facebook ?? "");
  const [instagram, setInstagram] = useState(contact.instagram ?? "");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      heroTagline: heroTagline.trim() || settings.heroTagline,
      backgroundStyle,
    });
    onUpdateContact({
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      facebook: facebook.trim() || undefined,
      instagram: instagram.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSave}
      className="grid gap-4 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
    >
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-900">
          Storefront appearance
        </h3>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Hero tagline
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={heroTagline}
            onChange={(e) => setHeroTagline(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Background style
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] hover:border-rose-300">
              <input
                type="radio"
                className="h-3 w-3 text-rose-600"
                checked={backgroundStyle === "gradient"}
                onChange={() => setBackgroundStyle("gradient")}
              />
              <span>
                <span className="block font-medium text-slate-800">
                  Soft gradient
                </span>
                <span className="text-[10px] text-slate-500">
                  Pink and rose tones for a dreamy feel.
                </span>
              </span>
            </label>
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] hover:border-rose-300">
              <input
                type="radio"
                className="h-3 w-3 text-rose-600"
                checked={backgroundStyle === "solid"}
                onChange={() => setBackgroundStyle("solid")}
              />
              <span>
                <span className="block font-medium text-slate-800">
                  Solid pastel
                </span>
                <span className="text-[10px] text-slate-500">
                  Minimal cream/rose background.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-xl bg-rose-50 p-3 text-[11px] text-rose-800">
          <p className="font-semibold">Preview</p>
          <p className="mt-1 text-[11px]">{heroTagline}</p>
          <p className="mt-1 text-[10px] text-rose-700">
            This copy appears in the header under the BlooMery logo on the storefront.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-900">
          Contact & business information
        </h3>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Phone / Viber
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700">
            Address
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700">
              Facebook
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700">
              Instagram
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
        >
          Save appearance & contact
        </button>

        <p className="text-[10px] text-slate-500">
          These details are stored in the system (simulated database) and used across
          the storefront and admin dashboard so that admins fully control the
          information shown to customers.
        </p>
      </div>
    </form>
  );
}

// --- Admin: Users ---

type AdminUsersTabProps = {
  users: User[];
};

function AdminUsersTab({ users }: AdminUsersTabProps) {
  const admins = users.filter((u) => u.role === "admin");
  const customers = users.filter((u) => u.role === "customer");

  return (
    <section className="grid gap-4 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200 lg:grid-cols-2">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-900">Admins</h3>
        <div className="space-y-1">
          {admins.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-1.5"
            >
              <div>
                <div className="text-xs font-medium text-slate-900">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-500">{user.email}</div>
              </div>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                Admin
              </span>
            </div>
          ))}
          {admins.length === 0 && (
            <p className="text-[11px] text-slate-500">
              No admin accounts found. The seeded admin will appear here after first
              login.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-900">Customers</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {customers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-1.5"
            >
              <div>
                <div className="text-xs font-medium text-slate-900">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-500">{user.email}</div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Customer
              </span>
            </div>
          ))}
          {customers.length === 0 && (
            <p className="text-[11px] text-slate-500">
              No customer accounts yet. When users register through the login screen,
              they will appear here.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

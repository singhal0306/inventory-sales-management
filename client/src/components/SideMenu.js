import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArchiveBoxIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { fetchProfilePhoto, userLogout } from "../store/userAction";

const navigationItems = [
  { to: "/", label: "Overview", icon: Squares2X2Icon },
  { to: "/manage-store", label: "Manage Store", icon: ArchiveBoxIcon },
  { to: "/sales", label: "Sales", icon: ShoppingCartIcon },
  { to: "/purchase-details", label: "Sales History", icon: ClipboardDocumentListIcon },
  { to: "/sales-analytics", label: "Analytics", icon: ChartBarIcon },
  { to: "/customers", label: "Customers", icon: UserGroupIcon },
];

function SideMenu() {
  const user = useSelector((state) => state.user.user);
  const profilePhotoUrl = useSelector((state) => state.user.profilePhotoUrl);
  const profilePhotoLoaded = useSelector((state) => state.user.profilePhotoLoaded);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const visibleNavigation = user.role === "admin"
    ? [...navigationItems, { to: "/admin/users", label: "Admin panel", icon: UserGroupIcon }]
    : navigationItems;

  const userInitials = String(user.name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (user.hasProfilePhoto && !profilePhotoLoaded) {
      dispatch(fetchProfilePhoto());
    }
  }, [dispatch, user.hasProfilePhoto, profilePhotoLoaded]);

  const isActive = (path) => {
    if (path === "/") return pathname === "/" || pathname.startsWith("/inventory/");
    if (path === "/purchase-details" || path === "/customers") {
      return pathname === path || pathname.startsWith(`${path}/`);
    }
    return pathname === path;
  };

  const logoutHandler = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await dispatch(userLogout());
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      setLoggingOut(false);
    }
  };

  const photo = profilePhotoUrl ? (
    <img src={profilePhotoUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    userInitials
  );

  return (
    <>
      <div className="col-span-12 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-3 pt-2">
          <Link to="/" className="flex shrink-0 items-center gap-2 px-2 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-700 text-white">
              <ArchiveBoxIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-slate-900">Stockroom</span>
          </Link>
          <Link to="/profile" aria-label="Open profile" className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200">
            {photo}
          </Link>
        </div>
        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto px-3 pb-2 pt-1">
          {visibleNavigation.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
          <Link
            to="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition ${
              pathname === "/profile" ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <UserCircleIcon className="h-4 w-4" aria-hidden="true" />
            Profile
          </Link>
          <button
            type="button"
            disabled={loggingOut}
            onClick={logoutHandler}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
            {loggingOut ? "Logging out" : "Log out"}
          </button>
        </nav>
        {logoutError && <p role="alert" className="px-4 pb-2 text-xs text-red-700">{logoutError}</p>}
      </div>

      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white lg:flex">
        <Link to="/" className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white">
            <ArchiveBoxIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Stockroom</span>
            <span className="block text-xs text-slate-500">Inventory workspace</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
          {visibleNavigation.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                    : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-emerald-700" : "text-slate-400"}`} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <Link
            to="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={`mb-2 flex items-center gap-3 rounded-md p-2 transition ${pathname === "/profile" ? "bg-emerald-50" : "hover:bg-slate-50"}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200">
              {photo}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-800">{user.name}</span>
              <span className="block truncate text-xs text-slate-500">{user.email}</span>
            </span>
            <UserCircleIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </Link>
          <button
            type="button"
            disabled={loggingOut}
            onClick={logoutHandler}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-current" aria-hidden="true" />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
          {logoutError && <p role="alert" className="mt-2 px-3 text-xs text-red-700">{logoutError}</p>}
        </div>
      </aside>
    </>
  );
}

export default SideMenu;

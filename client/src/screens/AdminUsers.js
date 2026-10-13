import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { fetchAdminUsers, updateAdminUser } from "../store/adminAction";
import { adminActions } from "../store/adminSlice";
import AdminUserAvatar from "../components/AdminUserAvatar";

const inputStyle = "w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100";

export default function AdminUsers() {
  const currentUser = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const { users, loading, saving, loaded, error, message } = useSelector((state) => state.admin);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (currentUser.role !== "admin") return;
    dispatch(adminActions.clearFeedback());
    dispatch(fetchAdminUsers());
  }, [currentUser._id, currentUser.role, dispatch]);

  const saveUser = async (event) => {
    event.preventDefault();
    if (saving || !editing) return;
    const saved = await dispatch(updateAdminUser(editing._id, editing));
    if (saved) setEditing(null);
  };

  if (currentUser.role !== "admin") return <Navigate to="/" replace />;
  const visibleUsers = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  const editingSelf = editing?._id === currentUser._id;

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <header className="mb-6 border-b border-slate-200 pb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">Administration</p>
          <h1 className="text-2xl font-semibold text-slate-900">Manage users</h1>
          <p className="mt-1 text-sm text-slate-500">Manage account details, roles, and access to your workspace.</p>
        </header>
        {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900">Users <span className="text-sm font-normal text-slate-500">({users.length})</span></h2>
              <label className="sr-only" htmlFor="user-search">Search users</label>
              <input id="user-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className={`${inputStyle} sm:max-w-xs`} />
            </div>
            {loading || (!loaded && !error) ? <p className="p-8 text-center text-sm text-slate-500">Loading users...</p> : visibleUsers.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{error ? "Users are unavailable." : "No users found."}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[550px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                    <th className="px-5 py-3 font-medium">User</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium"><span className="sr-only">Actions</span></th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">{visibleUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-emerald-50/30">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><AdminUserAvatar user={user} /><div className="min-w-0"><p className="font-medium text-slate-800">{user.name}{user._id === currentUser._id ? " (you)" : ""}</p><p className="text-xs text-slate-500">{user.email}</p></div></div></td>
                      <td className="px-5 py-4 capitalize text-slate-700">{user.role}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.isActive === false ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-800"}`}>{user.isActive === false ? "Disabled" : "Active"}</span></td>
                      <td className="px-5 py-4 text-right"><button type="button" disabled={saving} onClick={() => { setEditing({ ...user }); dispatch(adminActions.clearFeedback()); }} aria-label={`Edit ${user.name}`} className="rounded px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Edit</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{editing ? "Edit user" : "Account access"}</h2>
            {!editing ? <p className="mt-2 text-sm leading-6 text-slate-500">Select a user to edit their details or access. Disabled accounts cannot sign in or use the application. Their existing records are preserved.</p> : (
              <form onSubmit={saveUser} aria-busy={saving} className="mt-5 space-y-4">
                {[
                  { name: "name", label: "Name", type: "text" },
                  { name: "email", label: "Email", type: "email" },
                ].map((field) => <div key={field.name}><label htmlFor={`admin-${field.name}`} className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}</label><input id={`admin-${field.name}`} type={field.type} required disabled={saving} value={editing[field.name]} onChange={(event) => setEditing({ ...editing, [field.name]: event.target.value })} className={inputStyle} /></div>)}
                <div><label htmlFor="admin-role" className="mb-1.5 block text-sm font-medium text-slate-700">Role</label><select id="admin-role" disabled={saving || editingSelf} value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value })} className={inputStyle}><option value="user">User</option><option value="admin">Admin</option></select></div>
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={editing.isActive !== false} disabled={saving || editingSelf} onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })} className="h-4 w-4 accent-emerald-700" />Account active</label>
                {editingSelf && <p className="text-xs text-slate-500">You cannot remove your own admin access or disable your account.</p>}
                <div className="flex gap-2"><button type="submit" disabled={saving} className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button><button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm text-slate-600">Cancel</button></div>
              </form>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

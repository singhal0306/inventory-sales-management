import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminUserPhoto } from "../store/adminAction";

export default function AdminUserAvatar({ user }) {
  const dispatch = useDispatch();
  const photo = useSelector((state) => state.admin.photos[user._id]);
  const [failedUrl, setFailedUrl] = useState(null);
  const initials = String(user.name || "U").trim().split(/\s+/)
    .slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  useEffect(() => {
    if (user.hasProfilePhoto && !photo) dispatch(fetchAdminUserPhoto(user._id));
  }, [dispatch, user._id, user.hasProfilePhoto, photo]);

  const url = user.hasProfilePhoto && photo?.url;
  return (
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200">
      {url && url !== failedUrl ? (
        <img src={url} alt="" onError={() => setFailedUrl(url)} className="h-full w-full object-cover" />
      ) : initials || "U"}
    </span>
  );
}

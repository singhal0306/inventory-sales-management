import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Dialog } from "@headlessui/react";
import { ArrowLeftIcon, CameraIcon, TrashIcon, UserCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { fetchProfilePhoto, removeProfilePhoto, uploadProfilePhoto } from "../store/userAction";

const Profile = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const photoUrl = useSelector((state) => state.user.profilePhotoUrl);
  const photoLoading = useSelector((state) => state.user.profilePhotoLoading);
  const photoSaving = useSelector((state) => state.user.profilePhotoSaving);
  const photoError = useSelector((state) => state.user.profilePhotoError);
  const fileInputRef = useRef(null);
  const [validationError, setValidationError] = useState("");
  const [photoOptionsOpen, setPhotoOptionsOpen] = useState(false);
  const initials = String(user.name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    dispatch(fetchProfilePhoto());
  }, [dispatch]);

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setValidationError("");
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setValidationError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setValidationError("The image must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      await dispatch(uploadProfilePhoto(file));
      setPhotoOptionsOpen(false);
    } catch {
      setValidationError("Photo upload failed. Please try again.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setValidationError("");
    try {
      await dispatch(removeProfilePhoto());
      setPhotoOptionsOpen(false);
    } catch {
      setValidationError("Photo could not be removed. Please try again.");
    }
  };

  return (
    <main className="col-span-12 min-w-0 px-4 py-6 sm:px-6 lg:col-span-10 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to inventory
        </Link>

        <header className="mb-6 border-b border-slate-200 pb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">Account</p>
          <h1 className="text-2xl font-semibold text-slate-900">Your profile</h1>
        </header>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:p-7">
            <button
              type="button"
              disabled={photoLoading || photoSaving}
              onClick={() => {
                setValidationError("");
                setPhotoOptionsOpen(true);
              }}
              aria-label="Change profile picture"
              title="Change profile picture"
              className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-lg font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-wait"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : initials || <UserCircleIcon className="h-8 w-8" aria-hidden="true" />}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <CameraIcon className="h-6 w-6" aria-hidden="true" />
              </span>
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-900">{user.name || "User"}</h2>
              <p className="truncate text-sm text-slate-500">{user.email || "No email available"}</p>
            </div>
          </div>
          <dl className="divide-y divide-slate-100 px-5 sm:px-7">
            <div className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-sm text-slate-500">Name</dt>
              <dd className="break-words text-sm font-medium text-slate-800">{user.name || "Not available"}</dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="break-words text-sm font-medium text-slate-800">{user.email || "Not available"}</dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-sm text-slate-500">Account ID</dt>
              <dd className="break-all font-mono text-xs text-slate-600">{user._id || "Not available"}</dd>
            </div>
          </dl>
        </section>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handlePhotoChange}
          aria-label="Choose a profile photo"
        />

        <Dialog
          open={photoOptionsOpen}
          onClose={() => !photoSaving && setPhotoOptionsOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-slate-950/40" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="font-semibold text-slate-900">Profile picture</Dialog.Title>
                  <p className="mt-1 text-sm text-slate-500">JPEG, PNG, or WebP. Maximum size 2 MB.</p>
                </div>
                <button
                  type="button"
                  disabled={photoSaving}
                  onClick={() => setPhotoOptionsOpen(false)}
                  aria-label="Close profile picture options"
                  title="Close"
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  disabled={photoSaving || photoLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-md border border-slate-200 px-3 py-3 text-left text-sm font-medium text-slate-800 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
                >
                  <CameraIcon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  {photoSaving ? "Uploading..." : photoUrl ? "Upload or change picture" : "Upload picture"}
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    disabled={photoSaving}
                    onClick={handleRemovePhoto}
                    className="flex w-full items-center gap-3 rounded-md border border-slate-200 px-3 py-3 text-left text-sm font-medium text-red-700 hover:border-red-200 hover:bg-red-50 disabled:opacity-60"
                  >
                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                    Remove picture
                  </button>
                )}
              </div>
              {(validationError || photoError) && (
                <p role="alert" className="mt-3 text-sm text-red-700">{validationError || photoError}</p>
              )}
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    </main>
  );
};

export default Profile;

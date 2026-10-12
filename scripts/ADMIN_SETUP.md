# Enable the first administrator

New accounts receive `role: "user"`. Existing accounts without a role are also treated as ordinary users. Public registration cannot assign admin privileges.

To enable the first admin, edit that trusted user's document in your database management tool and set `role` to the string `admin`. Then sign out and sign in again, or refresh the app. The Admin panel appears in both desktop and mobile navigation.

Administrators can list users, edit name/email, assign `user` or `admin`, and disable/reactivate accounts. Accounts are retained to preserve bill and inventory attribution. An admin cannot disable or demote their own account.

Both `GET /api/user/admin/users` and `PATCH /api/user/admin/users/:id` run authentication followed by admin middleware. The server reloads the user's role and active status from the database on every protected request; role changes and disabling apply to existing sessions too. Responses never include passwords or profile photo data.

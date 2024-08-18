import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import validator from "validator";
import { useDispatch, useSelector } from "react-redux";
import { userLogin } from "../store/userAction";
import Spineer from "../components/Spineer";
import SuccessAlert from "../components/SuccessAlert";
import ErrorAlert from "../components/ErrorAlert";
import { getItems } from "../store/inventoryAction";
import { getBills } from "../store/billAction";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const loginState = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailIsOk = validator.isEmail(email);
    const passwordIsOk = password.trim().length >= 6;
    const dataIsOk = emailIsOk && passwordIsOk;
    if (dataIsOk) {
      setError(false);
      dispatch(userLogin({ email, password }));
    } else {
      setError(true);
    }
  };
  const navigate = useNavigate();
  useEffect(() => {
    if (loginState.loginSuccess) {
      dispatch(getItems())
      dispatch(getBills())
      setTimeout(() => navigate("/"), 2);
    }
  }, [loginState.loginSuccess, navigate, dispatch]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 h-screen  items-center place-items-center">
      <div className="flex justify-center">
        <img
          className="ps-10 w-3/4"
          src={require("../assets/signup.jpg")}
          alt=""
        />
      </div>
      <div className="w-full max-w-md space-y-8 p-10 rounded-lg">
        <div>
          <img
            className="mx-auto h-12 w-auto"
            src={require("../assets/logo.png")}
            alt="Your Company"
          />
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign In
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* <input type="hidden" name="remember" defaultValue="true" /> */}
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                value={email}
                type="email"
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                required
                className="relative block w-full rounded-t-md border-0 py-1.5 px-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-md border-0 py-1.5 px-1.5 mt-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-red-500">
                Password must be atleast 6 character long.
              </p>
            )}
          </div>

          {/* <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </span>
            </div>
          </div> */}

          <div>
            {loginState.loading && <Spineer />}
            {!loginState.loading && (
              <button
                type="submit"
                className="group relative flex w-full justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign in
              </button>
            )}
            <p className="mt-2 text-center text-sm text-gray-600">
              Or Don't Have an Account, Please{" "}
              <span className="font-medium text-indigo-600 hover:text-indigo-500">
                <Link to="/register"> Register now </Link>
              </span>
            </p>
          </div>
        </form>
        {loginState.loginFails && <ErrorAlert alert={loginState.error} />}
        {loginState.loginSuccess && (
          <SuccessAlert
            alert={loginState.success}
            message={"Redirecting to Home Screen"}
          />
        )}
      </div>
    </div>
  );
};

export default Login;

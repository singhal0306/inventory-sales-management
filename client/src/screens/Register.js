import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userRegistration } from "../store/registerAction";
import { useDispatch, useSelector } from "react-redux";
import validator from "validator";
import Spineer from "../components/Spineer";
import SuccessAlert from "../components/SuccessAlert";
import ErrorAlert from "../components/ErrorAlert";

const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPasword] = useState("");
  const [error, setError] = useState(false);

  const dispatch = useDispatch();
  const registerState = useSelector((state) => state.register);

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailIsOk = validator.isEmail(email);
    const dataIsOk =
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      emailIsOk &&
      password.trim().length >= 6;
    if (password.trim().length >= 6) {
      setError(false);
    } else {
      setError(true);
    }
    if (dataIsOk) {
      dispatch(userRegistration({ firstName, lastName, email, password }));
    }
  };

  const navigate = useNavigate();
  useEffect(() => {
    if (registerState.registerSuccess) {
      setTimeout(() => navigate("/login"), 2000);
    }
  }, [registerState.registerSuccess, navigate]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 h-screen items-center place-items-center">
      <div className="flex justify-center w-3/4">
        <img src={require("../assets/Login.png")} alt="" />
      </div>
      <div className="w-full max-w-md space-y-8 p-10 rounded-lg">
        <div>
          <img
            className="mx-auto h-12 w-auto"
            src={require("../assets/logo.png")}
            alt="Your Company"
          />
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign Up
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* <input type="hidden" name="remember" defaultValue="true"  /> */}
          <div className="flex flex-col gap-4 -space-y-px rounded-md shadow-sm">
            <div className="flex gap-4">
              <input
                name="firstName"
                type="text"
                required
                className="relative block w-full rounded-t-md border-0 py-1.5 px-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                name="lastName"
                type="text"
                required
                className="relative block w-full rounded-t-md border-0 py-1.5 px-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-md border-0 py-1.5 px-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-md border-0 py-1.5 px-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPasword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-red-500">
                Password must be atleast 6 character long.
              </p>
            )}
          </div>

          <div>
            {registerState.loading && <Spineer />}
            {!registerState.loading && (
              <button
                type="submit"
                className="group relative flex w-full justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign up
              </button>
            )}
            <p className="mt-2 text-center text-sm text-gray-600">
              Or Already Have an Account, Please
              <span className="font-medium text-indigo-600 hover:text-indigo-500">
                <Link to="/login"> Sign In now </Link>
              </span>
            </p>
          </div>
        </form>
        {registerState.registerFails && (
          <ErrorAlert alert={registerState.error} />
        )}
        {registerState.registerSuccess && (
          <SuccessAlert
            alert={registerState.success}
            message={"Redirecting to Login Screen"}
          />
        )}
      </div>
    </div>
  );
};

export default Register;

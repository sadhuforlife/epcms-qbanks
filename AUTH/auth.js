(function () {

    "use strict";


    // =========================================================
    // EPCMS AUTHENTICATION SYSTEM
    // =========================================================

    const CONFIG_URL =
        "/epcms-qbanks/AUTH/config.json";


    const SESSION_KEY =
        "epcms_auth_session";


    const CHECK_INTERVAL_MINUTES = 5;


    let config = null;

    let overlay = null;

    let isAuthenticated = false;

    let checking = false;


    // =========================================================
    // BASIC STYLING
    // =========================================================

    const style = document.createElement("style");

    style.textContent = `

        #epcms-auth-overlay {

            position: fixed;

            inset: 0;

            z-index: 2147483647;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 20px;

            background:
                radial-gradient(
                    circle at top,
                    #292929 0%,
                    #111111 45%,
                    #070707 100%
                );

            font-family:
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                Arial,
                sans-serif;

            color: white;

            box-sizing: border-box;
        }


        #epcms-auth-card {

            width: min(430px, 100%);

            padding: 38px 32px 32px;

            border-radius: 24px;

            background:
                rgba(25, 25, 25, 0.96);

            border:
                1px solid rgba(255,255,255,0.10);

            box-shadow:
                0 25px 80px rgba(0,0,0,0.65);

            text-align: center;

            box-sizing: border-box;

            animation:
                epcmsCardIn
                0.35s ease;
        }


        @keyframes epcmsCardIn {

            from {

                opacity: 0;

                transform:
                    translateY(15px)
                    scale(0.97);
            }

            to {

                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);
            }
        }


        #epcms-auth-logo {

            width: 76px;

            height: 76px;

            border-radius: 50%;

            object-fit: cover;

            margin-bottom: 18px;

            box-shadow:
                0 8px 30px rgba(0,0,0,0.35);
        }


        #epcms-auth-title {

            margin: 0;

            font-size: 29px;

            font-weight: 700;

            letter-spacing: -0.5px;
        }


        #epcms-auth-subtitle {

            margin:

                9px 0 25px;

            color:
                rgba(255,255,255,0.62);

            font-size: 14px;

            line-height: 1.5;
        }


        #epcms-auth-input {

            width: 100%;

            box-sizing: border-box;

            padding: 15px 16px;

            border-radius: 13px;

            border:
                1px solid rgba(255,255,255,0.12);

            background:
                rgba(255,255,255,0.07);

            color: white;

            outline: none;

            font-size: 16px;

            text-align: center;

            transition:
                0.2s ease;
        }


        #epcms-auth-input:focus {

            border-color:
                #ff9800;

            background:
                rgba(255,255,255,0.10);

            box-shadow:
                0 0 0 3px
                rgba(255,152,0,0.12);
        }


        #epcms-auth-button {

            width: 100%;

            margin-top: 14px;

            padding: 14px;

            border: none;

            border-radius: 13px;

            background:
                linear-gradient(
                    135deg,
                    #ff9800,
                    #ff6f00
                );

            color: white;

            font-size: 16px;

            font-weight: 700;

            cursor: pointer;

            transition:
                transform 0.15s ease,
                box-shadow 0.15s ease,
                opacity 0.15s ease;
        }


        #epcms-auth-button:hover {

            transform:
                translateY(-1px);

            box-shadow:
                0 8px 25px
                rgba(255,111,0,0.25);
        }


        #epcms-auth-button:active {

            transform:
                translateY(0);
        }


        #epcms-auth-message {

            min-height: 25px;

            margin-top: 18px;

            font-size: 14px;

            font-weight: 600;
        }


        .epcms-error {

            color:
                #ff5252;
        }


        .epcms-success {

            color:
                #ffb74d;
        }


        #epcms-auth-footer {

            margin-top: 25px;

            color:
                rgba(255,255,255,0.35);

            font-size: 11px;
        }


        #epcms-welcome {

            position: fixed;

            inset: 0;

            z-index: 2147483648;

            display: flex;

            align-items: center;

            justify-content: center;

            background:
                rgba(5,5,5,0.97);

            font-family:
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                Arial,
                sans-serif;

            color: white;

            animation:
                epcmsWelcomeIn
                0.15s ease;
        }


        #epcms-welcome-text {

            font-size: 34px;

            font-weight: 800;

            letter-spacing: 1px;

            text-align: center;
        }


        #epcms-welcome-heart {

            display: inline-block;

            margin-left: 5px;

            animation:
                epcmsHeart
                0.5s ease;
        }


        @keyframes epcmsWelcomeIn {

            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }


        @keyframes epcmsHeart {

            0% {
                transform: scale(0.5);
            }

            60% {
                transform: scale(1.25);
            }

            100% {
                transform: scale(1);
            }
        }

    `;


    // =========================================================
    // INSERT CSS
    // =========================================================

    document.documentElement.appendChild(style);


    // =========================================================
    // FETCH CONFIG
    // =========================================================

    async function getConfig() {

        const cacheBuster =
            "?v=" +
            Date.now();


        const response =
            await fetch(
                CONFIG_URL +
                cacheBuster,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load EPCMS authentication configuration."
            );
        }


        return await response.json();
    }


    // =========================================================
    // SESSION
    // =========================================================

    function getSession() {

        try {

            const raw =
                localStorage.getItem(
                    SESSION_KEY
                );


            if (!raw) {

                return null;
            }


            return JSON.parse(
                raw
            );

        } catch {

            localStorage.removeItem(
                SESSION_KEY
            );

            return null;
        }
    }


    function saveSession(
        version
    ) {

        const session = {

            version: version,

            authenticatedAt:
                Date.now()
        };


        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );
    }


    function clearSession() {

        localStorage.removeItem(
            SESSION_KEY
        );
    }


    // =========================================================
    // CHECK WHETHER SESSION IS VALID
    // =========================================================

    function sessionIsValid(
        session,
        currentConfig
    ) {

        if (!session) {

            return false;
        }


        if (
            session.version !==
            currentConfig.version
        ) {

            return false;
        }


        const age =
            Date.now() -
            Number(
                session.authenticatedAt
            );


        const maximumAge =
            Number(
                currentConfig.sessionHours
            ) *
            60 *
            60 *
            1000;


        if (
            !Number.isFinite(
                maximumAge
            )
        ) {

            return false;
        }


        return (
            age <
            maximumAge
        );
    }


    // =========================================================
    // SHA-256
    // =========================================================

    async function sha256(
        text
    ) {

        const encoder =
            new TextEncoder();


        const data =
            encoder.encode(
                text
            );


        const hashBuffer =
            await crypto.subtle.digest(
                "SHA-256",
                data
            );


        const hashArray =
            Array.from(
                new Uint8Array(
                    hashBuffer
                )
            );


        return hashArray
            .map(
                byte =>
                    byte
                        .toString(16)
                        .padStart(
                            2,
                            "0"
                        )
            )
            .join("");
    }


    // =========================================================
    // CREATE LOGIN SCREEN
    // =========================================================

    function createLoginScreen() {

        if (overlay) {

            return;
        }


        overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "epcms-auth-overlay";


        overlay.innerHTML = `

            <div id="epcms-auth-card">

                <img
                    id="epcms-auth-logo"
                    src="/epcms-qbanks/dp.jpg"
                    alt="EPCMS"
                    onerror="this.style.display='none';"
                >

                <h1 id="epcms-auth-title">
                    EPCMS
                </h1>

                <div id="epcms-auth-subtitle">
                    Enter your password to continue
                </div>

                <input
                    id="epcms-auth-input"
                    type="password"
                    placeholder="Enter password"
                    autocomplete="off"
                    spellcheck="false"
                >

                <button
                    id="epcms-auth-button"
                    type="button"
                >
                    ENTER
                </button>

                <div
                    id="epcms-auth-message"
                ></div>

                <div id="epcms-auth-footer">
                    Authorized students only
                </div>

            </div>
        `;


        document.body.appendChild(
            overlay
        );


        const input =
            document.getElementById(
                "epcms-auth-input"
            );


        const button =
            document.getElementById(
                "epcms-auth-button"
            );


        button.addEventListener(
            "click",
            authenticate
        );


        input.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    authenticate();
                }
            }
        );


        setTimeout(
            function () {

                input.focus();

            },
            100
        );
    }


    // =========================================================
    // SHOW MESSAGE
    // =========================================================

    function showMessage(
        text,
        type
    ) {

        const message =
            document.getElementById(
                "epcms-auth-message"
            );


        if (!message) {

            return;
        }


        message.textContent =
            text;


        message.className =
            type === "success"
                ? "epcms-success"
                : "epcms-error";
    }


    // =========================================================
    // AUTHENTICATE
    // =========================================================

    async function authenticate() {

        if (checking) {

            return;
        }


        checking = true;


        const input =
            document.getElementById(
                "epcms-auth-input"
            );


        const button =
            document.getElementById(
                "epcms-auth-button"
            );


        const password =
            input.value;


        if (!password) {

            showMessage(
                "Please enter your password.",
                "error"
            );


            checking = false;

            return;
        }


        button.disabled =
            true;


        button.style.opacity =
            "0.65";


        try {

            config =
                await getConfig();


            const enteredHash =
                await sha256(
                    password
                );


            if (
                enteredHash !==
                config.passwordHash
            ) {

                showMessage(
                    "ACCESS DENIED ⚠️",
                    "error"
                );


                input.value = "";


                input.focus();


                checking = false;


                button.disabled =
                    false;


                button.style.opacity =
                    "1";


                return;
            }


            // ==============================================
            // CORRECT PASSWORD
            // ==============================================

            saveSession(
                config.version
            );


            isAuthenticated =
                true;


            showWelcome();


        } catch (error) {

            console.error(
                "EPCMS authentication error:",
                error
            );


            showMessage(
                "Unable to verify access. Please try again.",
                "error"
            );


            button.disabled =
                false;


            button.style.opacity =
                "1";


            checking = false;
        }
    }


    // =========================================================
    // WELCOME SCREEN
    // =========================================================

    function showWelcome() {

        if (overlay) {

            overlay.remove();

            overlay = null;
        }


        const welcome =
            document.createElement(
                "div"
            );


        welcome.id =
            "epcms-welcome";


        welcome.innerHTML = `

            <div id="epcms-welcome-text">

                WELCOME
                <span id="epcms-welcome-heart">
                    🧡
                </span>

            </div>
        `;


        document.body.appendChild(
            welcome
        );


        setTimeout(
            function () {

                welcome.remove();

            },
            500
        );


        checking = false;
    }


    // =========================================================
    // FORCE LOCK
    // =========================================================

    function lockPage(
        message
    ) {

        isAuthenticated =
            false;


        clearSession();


        if (overlay) {

            overlay.remove();
        }


        overlay = null;


        createLoginScreen();


        if (message) {

            setTimeout(
                function () {

                    showMessage(
                        message,
                        "error"
                    );

                },
                100
            );
        }
    }


    // =========================================================
    // PERIODIC SESSION CHECK
    // =========================================================

    async function checkSession() {

        if (!isAuthenticated) {

            return;
        }


        try {

            const latestConfig =
                await getConfig();


            const session =
                getSession();


            if (
                !sessionIsValid(
                    session,
                    latestConfig
                )
            ) {

                lockPage(
                    "SESSION EXPIRED — PLEASE ENTER THE NEW PASSWORD"
                );


                return;
            }


            config =
                latestConfig;


        } catch (error) {

            console.warn(
                "EPCMS session check failed:",
                error
            );
        }
    }


    // =========================================================
    // INITIAL AUTHENTICATION
    // =========================================================

    async function initialize() {

        try {

            config =
                await getConfig();


            const session =
                getSession();


            if (
                sessionIsValid(
                    session,
                    config
                )
            ) {

                isAuthenticated =
                    true;


                return;
            }


            clearSession();


            createLoginScreen();


        } catch (error) {

            console.error(
                "EPCMS initialization error:",
                error
            );


            createLoginScreen();


            setTimeout(
                function () {

                    showMessage(
                        "Unable to load authentication. Please refresh.",
                        "error"
                    );

                },
                100
            );
        }
    }


    // =========================================================
    // RUN
    // =========================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();
    }


    // =========================================================
    // CHECK EVERY 5 MINUTES
    // =========================================================

    setInterval(
        checkSession,
        CHECK_INTERVAL_MINUTES *
        60 *
        1000
    );


})();
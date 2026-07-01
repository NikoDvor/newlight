import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Share2, PlusSquare, CheckCircle, Download, Smartphone } from "lucide-react";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { HomeFX } from "@/components/HomeFX";

const FG = "#EAF2FF";
const BORDER_TINT = "rgba(120,160,220,0.18)";
const BLUE = "#4DA3FF";

type Platform = "ios" | "android" | "installed" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  // iOS Safari standalone
  // @ts-expect-error legacy Apple flag
  if (window.navigator.standalone === true) return "installed";
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || (ua.includes("mac") && "ontouchend" in document);
  if (isIOS) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

export default function Install() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Load matching fonts to feel like Landing
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap";
    document.head.appendChild(link);

    setPlatform(detectPlatform());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPlatform("installed");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  const display = "'Rajdhani', 'Inter', system-ui, sans-serif";
  const body = "'Inter', system-ui, sans-serif";

  const effectivePlatform: Platform = installed ? "installed" : platform;

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ fontFamily: body, background: "#000000", color: FG }}
    >
      {/* HomeFX background, matching Landing */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          isolation: "isolate",
          pointerEvents: "none",
          animation: "nl-home-breath 4.6s ease-in-out infinite",
          willChange: "opacity",
        }}
        aria-hidden
      >
        <style>{`
          @keyframes nl-home-breath {
            0%, 100% { opacity: 0.85; }
            50%      { opacity: 1; }
          }
          @keyframes nl-logo-glow {
            0%, 100% { filter: drop-shadow(0 0 18px rgba(77,163,255,0.45)); }
            50%      { filter: drop-shadow(0 0 32px rgba(77,163,255,0.75)); }
          }
        `}</style>
        <HomeFX />
      </div>

      <main
        className="relative min-h-screen flex flex-col items-center justify-center px-6 py-10"
        style={{ zIndex: 10 }}
      >
        <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
          {/* Logo */}
          <img
            src={newlightLogo}
            alt="NewLight"
            style={{
              height: 72,
              width: "auto",
              background: "transparent",
              animation: "nl-logo-glow 4.6s ease-in-out infinite",
            }}
          />

          {/* Headline */}
          <h1
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: "clamp(30px, 7vw, 44px)",
              letterSpacing: "0.04em",
              lineHeight: 1.05,
              backgroundImage:
                "linear-gradient(180deg, #EAF2FF 0%, #7CB6FF 55%, #4DA3FF 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              margin: 0,
            }}
          >
            YOUR SYSTEM IS READY.
          </h1>

          <p
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: "rgba(234,242,255,0.75)",
              maxWidth: 380,
              margin: 0,
            }}
          >
            Install the NewLight Command Center on your device to access your workspace.
          </p>

          {/* Install surface */}
          <div
            className="w-full rounded-2xl p-5"
            style={{
              background: "rgba(10,18,32,0.55)",
              border: `1px solid ${BORDER_TINT}`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {effectivePlatform === "installed" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <CheckCircle size={44} color={BLUE} strokeWidth={1.5} />
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    fontSize: 16,
                    color: FG,
                  }}
                >
                  APP ALREADY INSTALLED
                </div>
                <p style={{ fontSize: 13.5, color: "rgba(234,242,255,0.7)" }}>
                  Open your Home Screen to find it.
                </p>
              </div>
            )}

            {effectivePlatform === "ios" && (
              <div className="flex flex-col gap-4 text-left">
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    fontSize: 13,
                    color: BLUE,
                    textAlign: "center",
                  }}
                >
                  ADD TO HOME SCREEN
                </div>
                <Step
                  icon={<Share2 size={22} color={BLUE} />}
                  n={1}
                  text={
                    <>
                      Tap the <strong>Share</strong> icon at the bottom of your browser.
                    </>
                  }
                />
                <Step
                  icon={<PlusSquare size={22} color={BLUE} />}
                  n={2}
                  text={
                    <>
                      Scroll down and tap <strong>"Add to Home Screen"</strong>.
                    </>
                  }
                />
                <Step
                  icon={<CheckCircle size={22} color={BLUE} />}
                  n={3}
                  text={
                    <>
                      Tap <strong>"Add"</strong> — the app will appear on your Home Screen.
                    </>
                  }
                />
              </div>
            )}

            {effectivePlatform === "android" && (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleInstall}
                  disabled={!deferred}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 transition-opacity"
                  style={{
                    background: deferred
                      ? "linear-gradient(180deg, #4DA3FF 0%, #2C7BE0 100%)"
                      : "rgba(77,163,255,0.25)",
                    color: "#03101F",
                    fontFamily: display,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    fontSize: 15,
                    boxShadow: deferred ? "0 8px 30px rgba(77,163,255,0.35)" : "none",
                    cursor: deferred ? "pointer" : "not-allowed",
                    opacity: deferred ? 1 : 0.7,
                    border: "none",
                  }}
                >
                  <Download size={18} />
                  INSTALL APP
                </button>
                {!deferred && (
                  <p style={{ fontSize: 12.5, color: "rgba(234,242,255,0.6)" }}>
                    If the button stays disabled, open this page in Chrome and tap the
                    menu → "Install app".
                  </p>
                )}
              </div>
            )}

            {effectivePlatform === "desktop" && (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <Smartphone size={40} color={BLUE} strokeWidth={1.5} />
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    fontSize: 15,
                    color: FG,
                  }}
                >
                  OPEN THIS PAGE ON YOUR PHONE
                </div>
                <p style={{ fontSize: 13, color: "rgba(234,242,255,0.7)" }}>
                  The NewLight Command Center installs on iOS and Android. Visit
                  newlight-app.com/install from your phone's browser.
                </p>
                {deferred && (
                  <button
                    onClick={handleInstall}
                    className="mt-2 rounded-xl px-5 py-2.5"
                    style={{
                      background: "linear-gradient(180deg, #4DA3FF 0%, #2C7BE0 100%)",
                      color: "#03101F",
                      fontFamily: display,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      fontSize: 14,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    INSTALL ON THIS DEVICE
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Login link */}
          <div style={{ fontSize: 13.5, color: "rgba(234,242,255,0.65)" }}>
            Already have access?{" "}
            <Link
              to="/auth"
              style={{
                color: BLUE,
                fontWeight: 600,
                textDecoration: "none",
                borderBottom: `1px solid ${BLUE}40`,
              }}
            >
              Log in →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({
  icon,
  n,
  text,
}: {
  icon: React.ReactNode;
  n: number;
  text: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{
          width: 40,
          height: 40,
          background: "rgba(77,163,255,0.10)",
          border: "1px solid rgba(77,163,255,0.28)",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 pt-1">
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            fontWeight: 700,
            color: "rgba(77,163,255,0.85)",
            marginBottom: 2,
          }}
        >
          STEP {n}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: FG }}>{text}</div>
      </div>
    </div>
  );
}

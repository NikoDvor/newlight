import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import newlightLogo from "@/assets/newlight-logo.jpg";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
      }}
    >
      <div className="text-center max-w-md">
        <img src={newlightLogo} alt="NewLight" className="h-12 w-auto mx-auto mb-6 object-contain" />
        <div
          className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "hsla(211,96%,56%,.1)" }}
        >
          <Search className="h-10 w-10" style={{ color: "hsl(211 96% 56%)" }} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">404</h1>
        <p className="text-sm text-white/50 mb-6">
          The page <code className="text-white/30 text-xs bg-white/5 px-1.5 py-0.5 rounded">{location.pathname}</code> doesn't exist or you may not have access.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/dashboard">
            <Button
              className="gap-1.5 text-white border-0"
              style={{
                background: "linear-gradient(135deg, hsl(217 90% 58%), hsl(211 96% 56%))",
                boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)",
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Go to Dashboard
            </Button>
          </Link>
          <Link to="/admin">
            <Button variant="outline" className="gap-1.5 border-white/10 text-white/60 hover:text-white hover:bg-white/5">
              Admin Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

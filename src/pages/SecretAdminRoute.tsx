import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Index from "./Index";

const SecretAdminRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if URL contains admin hash or parameter
    const urlParams = new URLSearchParams(location.search);
    const hasAdminParam = urlParams.get('admin') === 'true';
    const hasAdminHash = location.hash.includes('admin');
    
    if (hasAdminParam || hasAdminHash) {
      navigate('/admin-config');
    }
  }, [location, navigate]);

  return <Index />;
};

export default SecretAdminRoute;
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Video, Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, initialized, loading } = useAuth();

  // Removido array de navegação para uso interno
  const navigation: any[] = [];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  return null;
};

export default Navbar;

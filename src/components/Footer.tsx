import { Sparkles, Heart, Instagram, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-serif text-lg font-semibold text-foreground">
              Studio Nails
            </span>
          </div>
          <nav className="flex gap-4 items-center">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://wa.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          </nav>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Feito com <Heart className="h-3 w-3 text-primary fill-primary" /> Studio Nails
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

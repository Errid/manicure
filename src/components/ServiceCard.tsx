import { Clock, Sparkles } from "lucide-react";

interface ServiceCardProps {
  name: string;
  description: string;
  price: string;
  duration: string;
  selected?: boolean;
  onSelect?: () => void;
}

const ServiceCard = ({
  name,
  description,
  price,
  duration,
  selected,
  onSelect,
}: ServiceCardProps) => {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-6 rounded-lg border-2 transition-all duration-300 ${
        selected
          ? "border-primary bg-accent shadow-lg scale-[1.02]"
          : "border-border bg-card hover:border-primary/40 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {name}
          </h3>
        </div>
        <span className="text-lg font-bold text-primary">{price}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{duration}</span>
      </div>
    </button>
  );
};

export default ServiceCard;

import { Sprout } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FarmersPromoBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-primary/10 text-primary border-b border-border py-1.5 px-4 text-center text-xs font-medium sticky top-9 z-[55]">
      <button
        onClick={() => navigate("/farmers")}
        className="inline-flex items-center justify-center gap-1.5 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        <Sprout className="w-3.5 h-3.5" />
        <span>New: Farmers Solutions — Saplings, Biofertilizers, Beetles & More</span>
      </button>
    </div>
  );
};

export default FarmersPromoBanner;

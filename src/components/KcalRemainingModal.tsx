import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KcalRemainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (kcal: number) => void;
}

const KcalRemainingModal = ({ isOpen, onClose, onSave }: KcalRemainingModalProps) => {
  const [kcalRemaining, setKcalRemaining] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    const kcal = parseInt(kcalRemaining);
    if (kcal >= 1000 && kcal <= 4000) {
      onSave(kcal);
      setKcalRemaining("");
      onClose();
    }
  };

  const handleCancel = () => {
    toast({
      title: "Goal Required",
      description: "You must add a calorie goal for today.",
      variant: "destructive",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Set Today's Calorie Goal
          </DialogTitle>
          <DialogDescription>
            How many calories do you want to consume today? Enter a value between 1000-4000 kcal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="kcal" className="text-right">
              Calories
            </Label>
            <div className="col-span-3">
              <Input
                id="kcal"
                type="number"
                placeholder="e.g (1000-4000)"
                value={kcalRemaining}
                onChange={(e) => setKcalRemaining(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full"
                min="1000"
                max="4000"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!kcalRemaining || parseInt(kcalRemaining) < 1000 || parseInt(kcalRemaining) > 4000}
          >
            Set Goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KcalRemainingModal;

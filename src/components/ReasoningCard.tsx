import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface ReasoningCardProps {
  icon: ReactNode;
  title: string;
  content: string;
  color: "observation" | "interpretation" | "actionable";
}

const ReasoningCard = ({ icon, title, content, color }: ReasoningCardProps) => {
  const colorClasses = {
    observation: "border-l-4 border-l-[hsl(var(--observation))] bg-[hsl(var(--observation)/0.05)]",
    interpretation: "border-l-4 border-l-[hsl(var(--interpretation))] bg-[hsl(var(--interpretation)/0.05)]",
    actionable: "border-l-4 border-l-[hsl(var(--actionable))] bg-[hsl(var(--actionable)/0.05)]",
  };

  return (
    <Card className={`${colorClasses[color]} shadow-md transition-all hover:shadow-lg`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">{icon}</div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {title}
            </h3>
            <p className="text-foreground leading-relaxed">{content}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReasoningCard;
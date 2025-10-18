import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReasoningCardProps {
  icon: ReactNode;
  title: string;
  content: string;
  color: "observation" | "interpretation" | "actionable";
  isOpen?: boolean;
}

const ReasoningCard = ({ icon, title, content, color, isOpen = false }: ReasoningCardProps) => {
  const [open, setOpen] = useState(isOpen);
  const colorClasses = {
    observation: "border-l-4 border-l-[hsl(var(--observation))] bg-[hsl(var(--observation)/0.05)]",
    interpretation: "border-l-4 border-l-[hsl(var(--interpretation))] bg-[hsl(var(--interpretation)/0.05)]",
    actionable: "border-l-4 border-l-[hsl(var(--actionable))] bg-[hsl(var(--actionable)/0.05)]",
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={`${colorClasses[color]} shadow-md transition-all hover:shadow-lg`}>
        <CardContent className="p-4">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-3">
                <div>{icon}</div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  {title}
                </h3>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t">
              <div className="prose prose-sm max-w-none dark:prose-invert
                prose-headings:font-bold prose-headings:text-foreground
                prose-p:text-foreground prose-p:leading-relaxed prose-p:my-3
                prose-strong:text-foreground prose-strong:font-bold
                prose-ul:text-foreground prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6
                prose-ol:text-foreground prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6
                prose-li:my-1
                prose-table:text-foreground prose-table:my-4
                prose-thead:border-b prose-thead:border-border
                prose-th:p-2 prose-th:text-left prose-th:font-semibold
                prose-td:p-2 prose-td:border-t prose-td:border-border
                prose-hr:my-4 prose-hr:border-border
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
                prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded
                prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                prose-a:text-primary prose-a:underline">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
};

export default ReasoningCard;
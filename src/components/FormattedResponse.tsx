import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Lightbulb, Target } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface FormattedResponseProps {
  content: string;
}

const FormattedResponse = ({ content }: FormattedResponseProps) => {
  // Check if this is a structured analysis format
  const isStructuredAnalysis = content.includes("**") && (content.includes("**Total") || content.includes("**Average") || content.includes("**Breakdown by"));

  if (!isStructuredAnalysis) {
    // Render as markdown for better formatting
    return (
      <div className="bg-muted/50 px-4 py-3 rounded-lg prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown 
          components={{
            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-1 my-2" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-1 my-2" {...props} />,
            li: ({node, ...props}) => <li className="text-sm" {...props} />,
            p: ({node, ...props}) => <p className="mb-2" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // Parse structured content
  const lines = content.split('\n').filter(line => line.trim());
  
  // Extract title (first line with emoji)
  const titleLine = lines[0];
  const title = titleLine.replace(/^📊\s*/, '');

  // Find main metric line (Total or Average)
  const metricLine = lines.find(line => line.includes("**Total") || line.includes("**Average"));
  const metricMatch = metricLine?.match(/\*\*(.+?)\*\*:\s*(.+)/);
  const metricLabel = metricMatch ? metricMatch[1].trim() : "";
  const metricValue = metricMatch ? metricMatch[2].trim() : "";

  // Extract breakdown section
  const breakdownStartIdx = lines.findIndex(line => line.includes("**Breakdown by"));
  const insightsStartIdx = lines.findIndex(line => line.includes("**Key Insights"));
  const recommendationsStartIdx = lines.findIndex(line => line.includes("**Recommendations"));

  // Parse breakdown data
  const breakdownLines = breakdownStartIdx !== -1 && insightsStartIdx !== -1 
    ? lines.slice(breakdownStartIdx + 1, insightsStartIdx).filter(line => line.startsWith('-'))
    : [];
  
  const breakdownData = breakdownLines.map(line => {
    // Format: - Category: $XX,XXX.XX (XX.X% of total) or - Category: Value (XX.X%)
    const match = line.match(/-\s*(.+?):\s*([^\(]+)\s*(?:\((\d+\.?\d*%)[^\)]*\))?/);
    if (match) {
      return {
        condition: match[1].trim(),
        value: match[2].trim(),
        percentage: match[3] || ""
      };
    }
    return null;
  }).filter(Boolean);

  // Parse insights
  const insightLines = insightsStartIdx !== -1 && recommendationsStartIdx !== -1
    ? lines.slice(insightsStartIdx + 1, recommendationsStartIdx)
        .filter(line => line.startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
    : [];

  // Parse recommendations
  const recommendationLines = recommendationsStartIdx !== -1
    ? lines.slice(recommendationsStartIdx + 1)
        .filter(line => line.startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
    : [];

  return (
    <div className="space-y-4">
      {/* Title Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            📊 {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{metricLabel}</div>
            <div className="text-3xl font-bold text-primary">
              {metricValue}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Table */}
      {breakdownData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold text-right">Value</TableHead>
                  {breakdownData.some((item: any) => item.percentage) && (
                    <TableHead className="font-semibold text-right">Percentage</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdownData.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{item.condition}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-lg">
                      {item.value}
                    </TableCell>
                    {item.percentage && (
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.percentage}</Badge>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      {insightLines.length > 0 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-500" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insightLines.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1 font-bold">•</span>
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {insight}
                    </ReactMarkdown>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendationLines.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendationLines.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1 font-bold">→</span>
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {rec}
                    </ReactMarkdown>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FormattedResponse;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Database, HardDrive, TrendingUp, Zap, Upload, MessageSquare, History, BarChart3, ArrowLeft } from "lucide-react";

interface Integration {
  name: string;
  category: "Database" | "Integration" | "MCP";
  description: string;
  icon: React.ReactNode;
}

const integrations = {
  databases: [
    { name: "Postgres", category: "Database" as const, description: "PostgreSQL database", icon: <Database className="w-8 h-8" /> },
    { name: "BigQuery", category: "Database" as const, description: "Google BigQuery database", icon: <Database className="w-8 h-8" /> },
    { name: "Snowflake", category: "Database" as const, description: "Snowflake data warehouse", icon: <Database className="w-8 h-8" /> },
    { name: "Databricks", category: "Database" as const, description: "Databricks data platform", icon: <Database className="w-8 h-8" /> },
    { name: "MySQL", category: "Database" as const, description: "MySQL database", icon: <Database className="w-8 h-8" /> },
    { name: "SqlServer", category: "Database" as const, description: "Microsoft SQL Server", icon: <Database className="w-8 h-8" /> },
    { name: "Supabase", category: "Database" as const, description: "Supabase backend", icon: <Database className="w-8 h-8" /> },
    { name: "Vertica", category: "Database" as const, description: "Vertica analytics platform", icon: <Database className="w-8 h-8" /> },
  ],
  fileStorage: [
    { name: "Google Drive", category: "Integration" as const, description: "Analyze your Google Drive files and folders", icon: <HardDrive className="w-8 h-8" /> },
    { name: "Microsoft OneDrive", category: "Integration" as const, description: "Analyze your Personal OneDrive files and folders", icon: <HardDrive className="w-8 h-8" /> },
    { name: "SharePoint", category: "Integration" as const, description: "Analyze your SharePoint or OneDrive for Business files", icon: <HardDrive className="w-8 h-8" /> },
  ],
  advertising: [
    { name: "Google Ads", category: "Integration" as const, description: "Analyze your data and manage your campaigns in Google Ads", icon: <TrendingUp className="w-8 h-8" /> },
    { name: "Meta Ads", category: "Integration" as const, description: "Analyze your data and manage your campaigns in Meta Ads", icon: <TrendingUp className="w-8 h-8" /> },
  ],
  mcp: [
    { name: "Stripe", category: "MCP" as const, description: "Track revenue, subscriptions, and refunds with clean Stripe analytics", icon: <Zap className="w-8 h-8" /> },
    { name: "Zapier", category: "MCP" as const, description: "Automate workflows: sync data, trigger actions, and notify teams", icon: <Zap className="w-8 h-8" /> },
    { name: "Intercom", category: "MCP" as const, description: "Sync conversations, summarize feedback, and escalate support insights", icon: <Zap className="w-8 h-8" /> },
    { name: "Notion", category: "MCP" as const, description: "Summarize, update, and organize Notion pages programmatically within Julius", icon: <Zap className="w-8 h-8" /> },
    { name: "Github", category: "MCP" as const, description: "Search repositories, issues, and pull requests with actionable summaries", icon: <Zap className="w-8 h-8" /> },
  ],
};

const getBadgeVariant = (category: string) => {
  switch (category) {
    case "Database":
      return "default";
    case "Integration":
      return "secondary";
    case "MCP":
      return "outline";
    default:
      return "default";
  }
};

const Integrations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filterIntegrations = (items: Integration[]) => {
    if (!searchQuery) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredDatabases = filterIntegrations(integrations.databases);
  const filteredFileStorage = filterIntegrations(integrations.fileStorage);
  const filteredAdvertising = filterIntegrations(integrations.advertising);
  const filteredMcp = filterIntegrations(integrations.mcp);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div className="flex gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                History
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your favorite tools and data sources
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Databases Section */}
        {filteredDatabases.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Database className="w-6 h-6" />
              Databases
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDatabases.map((integration) => (
                <Card
                  key={integration.name}
                  className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {integration.icon}
                      </div>
                      <Badge variant={getBadgeVariant(integration.category)}>
                        {integration.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* File Storage Section */}
        {filteredFileStorage.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <HardDrive className="w-6 h-6" />
              File Storage
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFileStorage.map((integration) => (
                <Card
                  key={integration.name}
                  className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-3 rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                        {integration.icon}
                      </div>
                      <Badge variant={getBadgeVariant(integration.category)}>
                        {integration.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Advertising Platforms Section */}
        {filteredAdvertising.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Advertising Platforms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAdvertising.map((integration) => (
                <Card
                  key={integration.name}
                  className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-3 rounded-lg bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                        {integration.icon}
                      </div>
                      <Badge variant={getBadgeVariant(integration.category)}>
                        {integration.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* MCP Services Section */}
        {filteredMcp.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6" />
              MCP Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMcp.map((integration) => (
                <Card
                  key={integration.name}
                  className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {integration.icon}
                      </div>
                      <Badge variant={getBadgeVariant(integration.category)}>
                        {integration.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* No Results */}
        {filteredDatabases.length === 0 &&
          filteredFileStorage.length === 0 &&
          filteredAdvertising.length === 0 &&
          filteredMcp.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No integrations found matching "{searchQuery}"
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default Integrations;

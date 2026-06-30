import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle, CheckCircle2, XCircle, FileText, Plus } from "lucide-react";

export default function Approvals() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reviewedView, setReviewedView] = useState<"approved" | "rejected">("approved");

  const [contentType, setContentType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reviewer, setReviewer] = useState("");

  const resetForm = () => {
    setContentType("");
    setTitle("");
    setDescription("");
    setReviewer("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSheetOpen(false);
    resetForm();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Approvals"
        description="Submit content for review before publishing. Track status, feedback, and approvals across all your marketing."
      >
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Submit for Approval
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Pending Review" value="0" changeType="neutral" />
        <MetricCard label="Approved" value="0" changeType="neutral" />
        <MetricCard label="Rejected" value="0" changeType="neutral" />
        <MetricCard label="Total Submitted" value="0" changeType="neutral" />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="all">All Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <DataCard title="Awaiting Review">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-10 w-10 text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium text-foreground">No items pending approval</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Submit ads, web copy, emails, or social posts for review before publishing.
              </p>
              <Button className="mt-4" onClick={() => setSheetOpen(true)}>
                <Plus className="h-4 w-4" />
                Submit for Approval
              </Button>
            </div>
          </DataCard>
        </TabsContent>

        <TabsContent value="reviewed" className="mt-4">
          <DataCard title="Reviewed Items">
            <div className="flex items-center gap-2 mb-4">
              <Button
                size="sm"
                variant={reviewedView === "approved" ? "default" : "outline"}
                onClick={() => setReviewedView("approved")}
              >
                Approved
              </Button>
              <Button
                size="sm"
                variant={reviewedView === "rejected" ? "default" : "outline"}
                onClick={() => setReviewedView("rejected")}
              >
                Rejected
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {reviewedView === "approved" ? (
                <>
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground/60 mb-3" />
                  <p className="text-sm font-medium text-foreground">No approved items yet</p>
                </>
              ) : (
                <>
                  <XCircle className="h-10 w-10 text-muted-foreground/60 mb-3" />
                  <p className="text-sm font-medium text-foreground">No rejected items yet</p>
                </>
              )}
            </div>
          </DataCard>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <DataCard title="Submission History">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium text-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                All submitted content will appear here with full version history.
              </p>
            </div>
          </DataCard>
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Submit for Approval</SheetTitle>
            <SheetDescription>
              Send content to a reviewer before it goes live.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger id="content-type">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ad">Ad</SelectItem>
                  <SelectItem value="web">Web Page</SelectItem>
                  <SelectItem value="email">Email Campaign</SelectItem>
                  <SelectItem value="sms">SMS Campaign</SelectItem>
                  <SelectItem value="social">Social Post</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A short, descriptive name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this content is and why it needs approval"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewer">Assigned Reviewer</Label>
              <Input
                id="reviewer"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                placeholder="Name or email of who should approve"
              />
            </div>

            <SheetFooter className="pt-4">
              <Button type="submit">Submit</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

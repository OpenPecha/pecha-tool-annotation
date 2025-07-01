import { useState, useRef } from "react";
import { TextAnnotator } from "@/components/TextAnnotator";
import type { TextAnnotatorRef } from "@/components/TextAnnotator";
import { AnnotationSidebar } from "@/components/AnnotationSidebar";
import { TableOfContents } from "@/components/TableOfContents";
import { useToast } from "@/hooks/use-toast";
import { text_temp } from "@/data/text.ts";
import Navbar from "@/components/Navbar";
import ActionButtons from "@/components/ActionButtons";

export type Annotation = {
  id: string;
  type: "header" | "person" | "object";
  text: string;
  start: number;
  end: number;
};

const Index = () => {
  const [text, setText] = useState(text_temp);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedText, setSelectedText] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [tocOpen, setTocOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();
  const textAnnotatorRef = useRef<TextAnnotatorRef>(null);

  const addAnnotation = (type: "header" | "person" | "object") => {
    if (!selectedText) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type,
      text: selectedText.text,
      start: selectedText.start,
      end: selectedText.end,
    };

    setAnnotations([...annotations, newAnnotation]);
    setSelectedText(null);

    toast({
      title: "Annotation Added",
      description: `Added ${type} annotation: "${selectedText.text}"`,
    });
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(annotations.filter((ann) => ann.id !== id));
    toast({
      title: "Annotation Removed",
      description: "Annotation has been deleted",
    });
  };

  const handleHeaderClick = (annotation: Annotation) => {
    if (textAnnotatorRef.current) {
      textAnnotatorRef.current.scrollToPosition(
        annotation.start,
        annotation.end
      );
    }
  };

  const annotationsWithoutHeader = annotations.filter(
    (ann) => ann.type !== "header"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <div className="flex gap-6 justify-center  mx-auto relative">
        {/* Table of Contents - Left Sidebar */}
        <TableOfContents
          annotations={annotations}
          onHeaderClick={handleHeaderClick}
          onRemoveAnnotation={removeAnnotation}
          isOpen={tocOpen}
          onToggle={() => setTocOpen(!tocOpen)}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1  transition-all duration-300 ease-in-out min-w-0 max-w-5xl mx-auto ${
            tocOpen && sidebarOpen
              ? "mx-6"
              : tocOpen || sidebarOpen
              ? "mx-3"
              : "mx-0"
          }`}
          style={{
            marginLeft: tocOpen ? "0" : "60px",
            marginRight: sidebarOpen ? "0" : "60px",
          }}
        >
          <TextAnnotator
            ref={textAnnotatorRef}
            text={text}
            setText={setText}
            annotations={annotations}
            selectedText={selectedText}
            onTextSelect={setSelectedText}
            onAddAnnotation={addAnnotation}
            onRemoveAnnotation={removeAnnotation}
            readOnly={true}
          />
        </div>

        {/* Annotation Sidebar - Right Sidebar */}
        <div className="space-y-4">
          <ActionButtons annotations={annotations} text={text} />
          <AnnotationSidebar
            annotations={annotationsWithoutHeader}
            onRemoveAnnotation={removeAnnotation}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;

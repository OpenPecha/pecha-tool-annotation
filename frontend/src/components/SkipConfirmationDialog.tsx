import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SkipConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  textTitle?: string;
  isSkipping?: boolean;
}

export function SkipConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  textTitle,
  isSkipping = false,
}: SkipConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            ⚠️ Skip & Reject Text?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to skip and reject this text?{" "}
              {textTitle && <span className="font-medium">"{textTitle}"</span>}
            </p>
            <p className="text-orange-600 font-medium">
              ⚠️ This action is permanent - the text will never be shown to you
              again.
            </p>
            <p className="text-sm text-gray-600">
              The text will remain available for other users to work on.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isSkipping}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSkipping}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSkipping ? "Skipping..." : "Yes, Skip & Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

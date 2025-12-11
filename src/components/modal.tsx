import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  children: ReactNode;
}

const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
        {/* Modal Content */}
        <DialogHeader>
          <DialogTitle>Booking form</DialogTitle>
          <DialogDescription>
            Fill out the form below to book a course.
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;

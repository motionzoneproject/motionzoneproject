"use client";
import { useState } from "react";
import BookingForm from "@/components/boookning-form";
import Modal from "@/components/modal";
import { Button } from "@/components/ui/button";

export default function KursForm() {
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility

  // Open the modal
  const openModal = () => setIsModalOpen(true);

  // Close the modal
  const closeModal = () => setIsModalOpen(false);

  return (
    <div>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <BookingForm />
      </Modal>
      <Button
        className="text-black bg-white hover:bg-green-600 px-6 py-3 text-lg rounded-full"
        onClick={openModal} // Open modal on button click
      >
        Boka kurs
      </Button>
    </div>
  );
}

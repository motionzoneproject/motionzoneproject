"use client";

import { useEffect, useState } from "react";
import type { Event } from "@/lib/events";
import { fetchEvents } from "@/lib/events";
import Contact from "./components/Contact";
import Events from "./components/Events";
import Features from "./components/Features";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import Testimonials from "./components/Testimonials";

export default function Page() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("motion-zone-theme");

    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      const loadedEvents = await fetchEvents();
      setEvents(loadedEvents);
    };
    loadEvents();
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("motion-zone-theme", isDark ? "dark" : "light");
    }
  }, [isDark, mounted]);

  if (!mounted) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">💃🏻🕺🏽</div>
          <div className="text-white text-xl mb-4">MotionZone dansstudio</div>
          <div className="mx-auto w-20 h-20 rounded-full border-8 border-purple-500 border-t-pink-400 animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={isDark ? "w-full bg-slate-950" : "w-full bg-white"}>
      <Navbar />
      <Hero isDark={isDark} />
      <Events isDark={isDark} events={events} />
      <Features isDark={isDark} />
      <Testimonials isDark={isDark} />
      <Contact isDark={isDark} />
      <Footer />
    </div>
  );
}

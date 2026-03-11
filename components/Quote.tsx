"use client";

import { useState } from "react";

export default function Quote() {
  const funWorkQuotes = [
    { quote: "We were on a break!", character: "Ross Geller", show: "Friends" },
    {
      quote: "Pivot! Pivot! Pivot!",
      character: "Ross Geller",
      show: "Friends",
    },
    {
      quote: "Could I BE any more productive?",
      character: "Chandler Bing",
      show: "Friends",
    },
    {
      quote: "Smelly Cat, Smelly Cat, what are they feeding you?",
      character: "Phoebe Buffay",
      show: "Friends",
    },

    {
      quote: "I'm not superstitious, but I am a little stitious.",
      character: "Michael Scott",
      show: "The Office",
    },
    {
      quote:
        "Sometimes I'll start a sentence and I don't even know where it's going.",
      character: "Michael Scott",
      show: "The Office",
    },
    {
      quote: "Identity theft is not a joke, Jim!",
      character: "Dwight Schrute",
      show: "The Office",
    },
    {
      quote:
        "Whenever I'm about to do something, I think, 'Would an idiot do that?' And if they would, I do not do that thing.",
      character: "Dwight Schrute",
      show: "The Office",
    },

    {
      quote: "Cool cool cool cool cool.",
      character: "Jake Peralta",
      show: "Brooklyn Nine-Nine",
    },
    {
      quote: "No doubt, no doubt, no doubt.",
      character: "Jake Peralta",
      show: "Brooklyn Nine-Nine",
    },
    {
      quote: "Everything hurts and I'm dying.",
      character: "Gina Linetti",
      show: "Brooklyn Nine-Nine",
    },

    {
      quote: "Treat yo' self.",
      character: "Tom Haverford",
      show: "Parks and Recreation",
    },
    {
      quote: "Never half-ass two things. Whole-ass one thing.",
      character: "Ron Swanson",
      show: "Parks and Recreation",
    },
  ];

  const [quote] = useState(() => {
    const randomIndex = Math.floor(Math.random() * funWorkQuotes.length);
    return funWorkQuotes[randomIndex];
  });

  return (
    <>
      <div>{quote.quote}</div>
      <div>
        - {quote.character}, {quote.show}
      </div>
    </>
  );
}

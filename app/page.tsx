"use client";

import { useChat } from "@ai-sdk/react";
import type { Message } from "@ai-sdk/react";

import Image from "next/image";
import Bubble from "@/app/api/components/Bubble";
import LoadingBubble from "@/app/api/components/LoadingBubble";
import PromptSuggestionsRow from "@/app/api/components/PromptSuggestionRow";

import massArtLogo from "./assets/logo.png";

const Home = () => {
  const starterList: string[] = [
    "Masterpieces from the Minneapolis Institute of Art",
    "Hidden stories behind famous paintings",
    "Techniques of Renaissance masters",
    "Modern design movements",
  ];

  const {
    append,
    isLoading,
    messages,
    input,
    handleInputChange,
    handleSubmit,
  } = useChat();

  const noMessages = !messages || messages.length === 0;

  const handlePrompt = (promptText: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      content: promptText,
      role: "user",
    };
    void append(msg);
  };

  return (
    <div>
      <main>
        <Image src={massArtLogo} width={350} alt="MASS Art logo" />
        <section className={noMessages ? "" : "populated"}>
          {noMessages ? (
            <>
              <div className="starter-text">
                <p>
                  Your virtual guide through the world of art! Ask me about:
                </p>
                <ul className="starter-list">
                  {starterList.map((listItem, index) => (
                    <li key={index}>{listItem}</li>
                  ))}
                </ul>
                <p>
                  <blockquote>
                    &quot;Every artist was first an amateur&quot;
                  </blockquote>{" "}
                  — let&apos;s explore together!
                </p>
                <br />
                <PromptSuggestionsRow onPromptClick={handlePrompt} />
              </div>
            </>
          ) : (
            <>
              {messages.map((message, index) => (
                <Bubble key={`message-${index}`} message={message} />
              ))}
              {isLoading && <LoadingBubble />}
            </>
          )}
        </section>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="question-box"
            onChange={handleInputChange}
            value={input}
            placeholder="Ask me anything about art..."
          />
          <input type="submit" />
        </form>
      </main>
    </div>
  );
};

export default Home;

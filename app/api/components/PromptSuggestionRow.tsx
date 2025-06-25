import PromptSuggestionButton from "@/app/api/components/PromptSuggestionButton";

const PromptSuggestionsRow = ({ onPromptClick }) => {
  const prompts = [
    "What makes Picasso's Blue Period special?",
    "Describe the characteristics of Baroque sculpture",
    "How did Frida Kahlo incorporate symbolism in her works?",
    "What materials did Rodin use for his sculptures?",
  ];

  return (
    <div className="prompt-suggestion-row">
      {prompts.map((prompt, index) => (
        <PromptSuggestionButton
          key={`suggestion-${index}`}
          text={prompt}
          onClick={() => onPromptClick(prompt)}
        />
      ))}
    </div>
  );
};

export default PromptSuggestionsRow;

import { Delete, Space } from "lucide-react";

const rows = [
  ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х"],
  ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],
  ["я", "ч", "с", "м", "и", "т", "ь", "б", "ю"],
];

export function RussianKeyboard({ onKey, onBackspace, onSpace }) {
  return (
    <div className="russian-keyboard" aria-label="俄语键盘">
      {rows.map((row, rowIndex) => (
        <div className="russian-keyboard-row" key={`row-${rowIndex}`}>
          {row.map((letter) => (
            <button type="button" key={letter} onClick={() => onKey(letter)}>
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className="russian-keyboard-row keyboard-extra-row">
        <button type="button" onClick={() => onKey("ё")}>ё</button>
        <button type="button" onClick={() => onKey("ъ")}>ъ</button>
        <button type="button" className="keyboard-space" onClick={onSpace}>
          <Space size={15} />
          空格
        </button>
        <button type="button" onClick={onBackspace} aria-label="退格">
          <Delete size={16} />
        </button>
      </div>
    </div>
  );
}

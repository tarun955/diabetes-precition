"""Package the four route screenshots into one ordered PDF for slide generation."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "presentation" / "screenshots"
OUTPUT = ROOT / "presentation" / "prototype-screens.pdf"
FILES = [
    "01-overview.png",
    "02-predict-result.png",
    "03-compare-models.png",
    "04-understand-the-data.png",
]


def main() -> None:
    pages = [Image.open(SCREENSHOTS / name).convert("RGB") for name in FILES]
    pages[0].save(OUTPUT, save_all=True, append_images=pages[1:], resolution=144)
    print(f"Created {OUTPUT} with {len(pages)} pages")


if __name__ == "__main__":
    main()

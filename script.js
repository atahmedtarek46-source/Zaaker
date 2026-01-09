const API_KEY = "AIzaSyAejBGZ6dygLr7ZvsFYUn6auVwf44aBmsE";

async function askAI() {
  const question = document.getElementById("question").value;
  const answerDiv = document.getElementById("answer");

  if (!question.trim()) {
    answerDiv.textContent = "اكتب سؤال الأول 🙂";
    return;
  }

  answerDiv.textContent = "جارٍ التفكير... ⏳";

  try {
    const response = await fetch(
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: question }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "محصلش رد، جرّب تاني";

    answerDiv.textContent = text;
  } catch (err) {
    answerDiv.textContent = "حصل خطأ ❌";
    console.error(err);
  }
}

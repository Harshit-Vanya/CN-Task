document.getElementById("fetchBtn").addEventListener("click", async () => {
  const res = await fetch("http://localhost:5000/api/message");
  const data = await res.json();
  document.getElementById("response").innerText = data.message;
});

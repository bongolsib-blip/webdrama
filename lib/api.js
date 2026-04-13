
const BASE_API = "https://drama-liart.vercel.app";

export async function getList(page = 1) {
  const res = await fetch(`${BASE_API}/list?page=${page}`);
  return res.json();
}


import Link from "next/link";
import { getList } from "@/lib/api";

export default async function Home() {
  const data = await getList(1);

  return (
    <div style={{ padding: 20 }}>
      <h2>Drama List</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {data?.data?.items?.map((item, i) => (
          <Link key={i} href={`/detail/${item.slug}`}>
            <div style={{ border: "1px solid #ccc", padding: 10 }}>
              <img src={item.thumbnail} width="100%" />
              <p>{item.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

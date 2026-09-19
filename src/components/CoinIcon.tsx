import { useEffect, useState } from "react";

export function CoinIcon({
  image,
  symbol,
  name,
  size = 32,
}: {
  image?: string;
  symbol: string;
  name?: string;
  size?: number;
}) {
  const [fail, setFail] = useState(!image);
  useEffect(() => setFail(!image), [image]);
  if (fail) {
    return (
      <span className="coin-ico" style={{ width: size, height: size }}>
        {(symbol || name || "?").slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return <img className="coin-ico-img" src={image} alt="" width={size} height={size} onError={() => setFail(true)} />;
}

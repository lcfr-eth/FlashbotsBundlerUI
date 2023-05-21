import { PageHeader } from "antd";
import React from "react";

// displays a page header

export default function Header() {
  return (
    <a href="https://github.com/lcfr-eth/FlashbotsBundlerUI" target="_blank" rel="noopener noreferrer">
      <PageHeader
        title="Flashbots Bundler"
        subTitle="Bundle TXs"
        style={{ cursor: "pointer" }}
        className="site-page-header"
        avatar={{
          src: "https://dl.openseauserdata.com/cache/originImage/files/a64cab164a02b7b42693af60638671bd.png",
        }}
      />
    </a>
  );
}

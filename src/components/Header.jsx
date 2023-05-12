import { PageHeader } from "antd";
import React from "react";

// displays a page header

export default function Header() {
  return (
    <a href="https://github.com/lcfr-eth/FlashbotsBundlerUI" target="_blank" rel="noopener noreferrer">
      <PageHeader
        title="ENSVision Flashbots Bundler"
        subTitle="Bundle TXs"
        style={{ cursor: "pointer" }}
        className="site-page-header"
        avatar={{
          src: "https://avatars.githubusercontent.com/u/71380475?s=200&v=4",
        }}
      />
    </a>
  );
}

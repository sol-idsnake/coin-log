/** App banner: coin-log title and dark/light mode toggle. */
import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import "./Header.scss";

export default function Header() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <header className="header">
      <div className="header__inner">
        <span className="header__title">coin-log</span>
        <ActionIcon
          aria-label="Toggle dark mode"
          className="header__theme-toggle"
          size="auto"
          variant="transparent"
          onClick={toggleColorScheme}
        >
          {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
        </ActionIcon>
      </div>
    </header>
  );
}

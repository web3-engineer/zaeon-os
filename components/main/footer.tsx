import Link from "next/link";

import FOOTER_DATA from "@/constants";

type FooterLink = {
  icon?: React.ComponentType<any> | null;
  name: string;
  link: string;
};
type FooterColumn = {
  title: string;
  data: FooterLink[];
};

const COLUMNS: FooterColumn[] = Array.isArray(FOOTER_DATA)
  ? (FOOTER_DATA as unknown as FooterColumn[])
  : [];

export const Footer = () => {
  return (
    <div className="w-full h-full bg-transparent text-gray-200 shadow-lg p-[15px]">
      <div className="w-full flex flex-col items-center justify-center m-auto">
        <div className="w-full h-full flex flex-row items-center justify-around flex-wrap">
          {COLUMNS.length === 0 ? (
            <div className="w-full text-center text-white/60 py-6">
              {/* Fallback discreto quando não há dados de rodapé */}
              <span>Zaeon - AI Agents for a New World</span>
            </div>
          ) : (
            COLUMNS.map((column) => (
              <div
                key={column.title}
                className="min-w-[200px] h-auto flex flex-col items-center justify-start"
              >
                <h3 className="font-bold text-[16px]">{column.title}</h3>
                {Array.isArray(column.data) &&
                  column.data.map(({ icon: Icon, name, link }) => (
                    <Link
                      key={`${column.title}-${name}`}
                      href={link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex flex-row items-center my-[15px]"
                    >
                      {Icon ? <Icon /> : null}
                      <span className="text-[15px] ml-[6px]">{name}</span>
                    </Link>
                  ))}
              </div>
            ))
          )}
        </div>

        <div className="mb-[20px] text-[15px] text-center">
          &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

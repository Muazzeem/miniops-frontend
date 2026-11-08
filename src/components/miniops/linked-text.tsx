import { Fragment } from "react";

export function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/gi);

  return (
    <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
      {parts.map((part, index) => {
        if (index % 2 === 0) return part;

        let url = part.replace(/[.,!?;:]+$/, "");
        while (url.endsWith(")") && url.split(")").length > url.split("(").length) {
          url = url.slice(0, -1);
        }

        return (
          <Fragment key={index}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm text-primary underline underline-offset-2 hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {url}
            </a>
            {part.slice(url.length)}
          </Fragment>
        );
      })}
    </p>
  );
}

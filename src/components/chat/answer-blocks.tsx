"use client";

import { ProgressBar, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { CheckmarkFilled, CheckmarkOutline, FunctionMath, MisuseOutline, TriangleSolid, WarningAlt } from "@carbon/icons-react";
import type { AnswerBlock } from "@/types/chat";
import styles from "./chat.module.scss";

const percent = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentShort = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

function MetricBlock({ block }: { block: Extract<AnswerBlock, { type: "metric" }> }) {
  const reached = block.value >= block.target;
  const clamped = Math.min(100, Math.max(0, block.value));
  const targetText = `${percentShort.format(block.target)}%`;

  return (
    <div className={`${styles.metric}${reached ? "" : ` ${styles.metricBelow}`}`}>
      <div className={styles.metricHeader}>
        <span>{block.label}</span>
        <Tag type={reached ? "green" : "warm-gray"} size="sm" renderIcon={reached ? CheckmarkOutline : WarningAlt}>
          {reached ? `Di atas target ${targetText}` : `Di bawah target ${targetText}`}
        </Tag>
      </div>
      <p className={styles.metricValue}>{percent.format(block.value)}%</p>
      <div className={styles.metricTrack}>
        <ProgressBar
          label={block.label}
          hideLabel
          value={clamped}
          max={100}
          status={reached ? "finished" : "active"}
          size="small"
        />
        {/* Posisi penanda bergantung pada nilai target dari data, sehingga memakai style dinamis. */}
        <span className={styles.metricMarker} style={{ insetInlineStart: `${block.target}%` }} aria-hidden="true" />
      </div>
      <div className={styles.metricFooter}>
        <span>{block.caption}</span>
        <span>
          <TriangleSolid size={12} aria-hidden="true" />
          Target {targetText}
        </span>
      </div>
    </div>
  );
}

function TableBlock({ block }: { block: Extract<AnswerBlock, { type: "table" }> }) {
  const cellClass = (column: (typeof block.columns)[number]) =>
    [column.align === "end" ? styles.cellEnd : "", column.emphasis ? styles.cellEmphasis : ""].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={styles.tableWrap}>
      <Table size="sm" useZebraStyles={false}>
        <TableHead>
          <TableRow>
            {block.columns.map((column) => (
              <TableHeader key={column.key} className={column.align === "end" ? styles.cellEnd : undefined}>
                {column.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {block.rows.map((row, index) => (
            <TableRow key={index}>
              {block.columns.map((column) => (
                <TableCell key={column.key} className={cellClass(column)}>
                  {row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AnswerBlocks({ blocks }: { blocks: AnswerBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "text":
            return (
              <p key={index} className={styles.answerText}>
                {block.text}
              </p>
            );
          case "note":
            return (
              <p key={index} className={styles.note}>
                {block.text}
              </p>
            );
          case "metric":
            return <MetricBlock key={index} block={block} />;
          case "formula":
            return (
              <figure key={index} className={styles.formula}>
                <figcaption className={styles.formulaTitle}>
                  <FunctionMath size={16} aria-hidden="true" />
                  Formula
                </figcaption>
                <pre className={styles.formulaCode}>{block.lines.join("\n")}</pre>
              </figure>
            );
          case "table":
            return <TableBlock key={index} block={block} />;
          case "list": {
            const excluded = block.variant === "excluded";
            const Icon = excluded ? MisuseOutline : CheckmarkFilled;
            return (
              <ul key={index} className={styles.list} aria-label={excluded ? "Tidak diakui" : "Diakui"}>
                {block.items.map((item) => (
                  <li key={item}>
                    <Icon
                      size={16}
                      className={excluded ? styles.iconExcluded : styles.iconIncluded}
                      aria-label={excluded ? "Tidak diakui" : "Diakui"}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          }
        }
      })}
    </>
  );
}

import type { Metadata } from "next";
import { LegalPageShell, DynamicLegalSections } from "../LegalPageShell";
import { getPublicLegalData, getDynamicPageBlock } from "../legal-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Условия возврата | Робокс Липецк",
  description: "Правила обращения за возвратом оплаты за услуги школы робототехники Робокс.",
};

export default async function RefundPage() {
  const data = await getPublicLegalData();
  const pageBlock = await getDynamicPageBlock(
    "legal.page.refund",
    "Условия возврата",
    "Порядок обращения за возвратом, сроки рассмотрения и способ возврата денежных средств.",
    `### Порядок обращения
Для оформления возврата Заказчик направляет обращение администратору по email ${data.email} или телефону ${data.phone}. В обращении необходимо указать ФИО плательщика, имя ребёнка, дату оплаты, сумму и причину возврата.
### Сроки рассмотрения
Обращение рассматривается в разумный срок после получения всех необходимых данных. Администратор может запросить дополнительную информацию для идентификации платежа и расчёта суммы возврата.
### Способ возврата
При оплате банковской картой возврат осуществляется на карту, с которой была произведена оплата, если иное не предусмотрено правилами банка или законодательством.
### Полный и частичный возврат
Полный или частичный возврат производится с учётом фактически оказанных услуг, условий публичной оферты, выбранного абонемента и действующих правил организации.
### Контакты
Контакты для обращения по вопросам возврата: ${data.email}, ${data.phone}.`
  );

  return (
    <LegalPageShell
      title={pageBlock.title}
      lead={pageBlock.subtitle}
    >
      <DynamicLegalSections bodyText={pageBlock.body} />
    </LegalPageShell>
  );
}

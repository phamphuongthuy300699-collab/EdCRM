import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "../LegalPageShell";
import { getPublicLegalData } from "../legal-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Условия возврата | Робокс Липецк",
  description: "Правила обращения за возвратом оплаты за услуги школы робототехники Робокс.",
};

export default async function RefundPage() {
  const data = await getPublicLegalData();

  return (
    <LegalPageShell
      title="Условия возврата"
      lead="Порядок обращения за возвратом, сроки рассмотрения и способ возврата денежных средств."
    >
      <LegalSection title="Порядок обращения">
        <p>
          Для оформления возврата Заказчик направляет обращение администратору по email <strong>{data.email}</strong> или телефону{" "}
          <strong>{data.phone}</strong>. В обращении необходимо указать ФИО плательщика, имя ребёнка, дату оплаты, сумму и причину возврата.
        </p>
      </LegalSection>
      <LegalSection title="Сроки рассмотрения">
        <p>
          Обращение рассматривается в разумный срок после получения всех необходимых данных. Администратор может запросить дополнительную
          информацию для идентификации платежа и расчёта суммы возврата.
        </p>
      </LegalSection>
      <LegalSection title="Способ возврата">
        <p>
          При оплате банковской картой возврат осуществляется на карту, с которой была произведена оплата, если иное не предусмотрено правилами
          банка или законодательством.
        </p>
      </LegalSection>
      <LegalSection title="Полный и частичный возврат">
        <p>
          Полный или частичный возврат производится с учётом фактически оказанных услуг, условий публичной оферты, выбранного абонемента и
          действующих правил организации.
        </p>
      </LegalSection>
      <LegalSection title="Контакты">
        <p>
          Контакты для обращения по вопросам возврата: <strong>{data.email}</strong>, <strong>{data.phone}</strong>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

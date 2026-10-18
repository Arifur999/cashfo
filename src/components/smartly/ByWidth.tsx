// Two wordings of one thing, as the phone and the wide boards each write it
// ("EN" and "English", "See all" and "See all transactions"): the phone one
// below md, the wide one from md up. Plain CSS, so the server and the
// browser render the same text.
const ByWidth = ({ phone, wide }: { phone: React.ReactNode; wide: React.ReactNode }) => (
  <>
    <span className="md:hidden">{phone}</span>
    <span className="hidden md:inline">{wide}</span>
  </>
);

export default ByWidth;

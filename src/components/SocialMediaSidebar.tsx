import { Facebook, Instagram, Youtube, MessageCircle } from "lucide-react";

const SocialMediaSidebar = () => {
  const socialLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      href: "https://facebook.com/californiafarmsindia",
      bgColor: "bg-[#1877F2]",
      hoverColor: "hover:bg-[#166FE5]",
    },
    {
      name: "Instagram",
      icon: Instagram,
      href: "https://instagram.com/californiafarmsindia",
      bgColor: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
      hoverColor: "hover:opacity-90",
    },
    {
      name: "YouTube",
      icon: Youtube,
      href: "https://youtube.com/@californiafarmsindia",
      bgColor: "bg-[#FF0000]",
      hoverColor: "hover:bg-[#CC0000]",
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: "https://wa.me/918149712801",
      bgColor: "bg-[#25D366]",
      hoverColor: "hover:bg-[#20BD5A]",
    },
  ];

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-0 shadow-lg rounded-l-lg overflow-hidden">
      {socialLinks.map((social) => (
        <a
          key={social.name}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${social.bgColor} ${social.hoverColor} text-white p-3 transition-all duration-300 hover:pl-5 group flex items-center justify-center`}
          aria-label={social.name}
        >
          <social.icon className="w-5 h-5" />
        </a>
      ))}
    </div>
  );
};

export default SocialMediaSidebar;
